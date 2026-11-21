package expo.modules.ankiactivity

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URI
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicLong
import javax.net.ssl.HttpsURLConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val RELEASE_CERTIFICATE = "15ccfdb1ab164994b925cbe9667218be7073815cf7892af5c43300fed06e9a13"
private const val MIN_APK_BYTES = 1L
private const val MAX_APK_BYTES = 128L * 1024 * 1024
private const val PROGRESS_INTERVAL_MS = 500L
private const val DOWNLOAD_PROGRESS_EVENT = "downloadProgress"
private const val APK_MIME_TYPE = "application/vnd.android.package-archive"
private val releaseTag = Regex("v[0-9]+\\.[0-9]+\\.[0-9]+")
private val sha256Hex = Regex("[0-9a-f]{64}")

class ApkUpdateProvider : FileProvider()

class AppUpdateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppUpdate")
    Events(DOWNLOAD_PROGRESS_EVENT)

    Function("getInstalledBuild") {
      val installed = installedPackage()
      mapOf(
        "version" to installed.versionName.orEmpty(),
        "canUpdate" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
          installed.signerDigests() == setOf(RELEASE_CERTIFICATE))
      )
    }

    Function("canInstallUpdates") {
      canInstallUpdates()
    }

    AsyncFunction("openInstallSettings") {
      val activity = requireNotNull(appContext.currentActivity)
      check(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
      activity.startActivity(
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("downloadUpdate") Coroutine { tag: String, digest: String, size: Long ->
      withContext(Dispatchers.IO) {
        require(releaseTag.matches(tag))
        require(sha256Hex.matches(digest))
        require(size in MIN_APK_BYTES..MAX_APK_BYTES)
        val installed = installedPackage()
        require(installed.signerDigests() == setOf(RELEASE_CERTIFICATE))

        val destination = updateFile
        check(destination.parentFile?.let { it.isDirectory || it.mkdirs() } == true)
        val pending = File.createTempFile("apk-", ".apk", context.cacheDir)
        val received = AtomicLong()
        val reporting = launch {
          var previousBytes = 0L
          var previousTime = SystemClock.elapsedRealtime()
          var previousRate = 0L
          while (true) {
            delay(PROGRESS_INTERVAL_MS)
            val bytes = received.get()
            val now = SystemClock.elapsedRealtime()
            val rate = (bytes - previousBytes) * 1_000 / (now - previousTime).coerceAtLeast(1)
            if (bytes != previousBytes || rate != previousRate) reportProgress(tag, bytes, rate)
            previousBytes = bytes
            previousTime = now
            previousRate = rate
          }
        }
        try {
          downloadApk(tag, size, pending, digest) { received.set(it) }
          reporting.cancelAndJoin()
          reportProgress(tag, size, 0)
          validateUpdate(pending, installed, tag)
          check(pending.renameTo(destination))
        } finally {
          reporting.cancel()
          pending.delete()
        }
        Unit
      }
    }

    AsyncFunction("installUpdate") {
      val activity = requireNotNull(appContext.currentActivity)
      check(canInstallUpdates())
      check(updateFile.isFile)
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.apk-update", updateFile)
      activity.startActivity(
        Intent(Intent.ACTION_VIEW).setDataAndType(uri, APK_MIME_TYPE)
          .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      )
    }.runOnQueue(Queues.MAIN)
  }

  private fun reportProgress(tag: String, bytesReceived: Long, bytesPerSecond: Long) {
    sendEvent(DOWNLOAD_PROGRESS_EVENT, mapOf(
      "tag" to tag, "bytesReceived" to bytesReceived, "bytesPerSecond" to bytesPerSecond,
    ))
  }

  private fun canInstallUpdates(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && context.packageManager.canRequestPackageInstalls()

  private fun validateUpdate(file: File, installed: PackageInfo, tag: String) {
    @Suppress("DEPRECATION")
    val apk = requireNotNull(context.packageManager.getPackageArchiveInfo(file.path, signingFlags))
    require(apk.packageName == installed.packageName)
    require(apk.versionName == tag.removePrefix("v"))
    require(PackageInfoCompat.getLongVersionCode(apk) > PackageInfoCompat.getLongVersionCode(installed))
    require(apk.signerDigests() == installed.signerDigests())
  }

  @Suppress("DEPRECATION")
  private fun installedPackage(): PackageInfo =
    context.packageManager.getPackageInfo(context.packageName, signingFlags)

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val updateFile: File
    get() = File(context.cacheDir, "app-update/Anki-Streak.apk")
}

private fun downloadApk(
  tag: String, expectedSize: Long, file: File, expectedDigest: String, onProgress: (Long) -> Unit,
) {
  var url = URI("https://github.com/B0und/anki-streak/releases/download/$tag/Anki-Streak.apk")
  repeat(4) {
    require(url.scheme == "https" && url.userInfo == null && url.port == -1)
    require(url.host == "github.com" || url.host == "release-assets.githubusercontent.com")
    val connection = url.toURL().openConnection() as HttpsURLConnection
    connection.instanceFollowRedirects = false
    connection.connectTimeout = 15_000
    connection.readTimeout = 30_000
    connection.setRequestProperty("Accept-Encoding", "identity")
    try {
      when (connection.responseCode) {
        301, 302, 303, 307, 308 -> {
          url = url.resolve(requireNotNull(connection.getHeaderField("Location")))
        }
        200 -> {
          val digest = MessageDigest.getInstance("SHA-256")
          var total = 0L
          connection.inputStream.use { input ->
            file.outputStream().use { output ->
              val buffer = ByteArray(64 * 1024)
              while (true) {
                val bytes = input.read(buffer)
                if (bytes == -1) break
                total += bytes
                check(total <= expectedSize)
                digest.update(buffer, 0, bytes)
                output.write(buffer, 0, bytes)
                onProgress(total)
              }
            }
          }
          check(total == expectedSize && digest.digest().toHex() == expectedDigest)
          return
        }
        else -> error("GitHub APK download failed with HTTP ${connection.responseCode}")
      }
    } finally {
      connection.disconnect()
    }
  }
  error("Too many APK download redirects")
}

private val signingFlags: Int
  @Suppress("DEPRECATION")
  get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    PackageManager.GET_SIGNING_CERTIFICATES
  } else {
    PackageManager.GET_SIGNATURES
  }

@Suppress("DEPRECATION")
private fun PackageInfo.signerDigests(): Set<String> {
  val signers = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    signingInfo?.apkContentsSigners
  } else {
    signatures
  }
  return signers.orEmpty().mapTo(mutableSetOf()) { signer ->
    MessageDigest.getInstance("SHA-256").digest(signer.toByteArray()).toHex()
  }
}

private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
