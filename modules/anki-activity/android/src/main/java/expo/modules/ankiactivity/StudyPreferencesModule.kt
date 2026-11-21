package expo.modules.ankiactivity

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Resources
import android.os.Build
import android.net.Uri
import android.provider.Settings
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL_ID = "study-milestones"
private const val CELEBRATION_NOTIFICATION = 41
private val milestoneLock = Any()

class StudyPreferencesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StudyPreferences")

    Function("shouldOnboard") { shouldOnboard() }

    Function("getPreference") { key: String -> preferences.getString(key, null) }

    Function("setPreference") { key: String, value: String ->
      preferences.edit().putString(key, value).apply()
      Unit
    }

    Function("getSystemLanguage") { Resources.getSystem().configuration.locales[0].language }

    Function("getNotificationAccess") { canPostMilestone() }

    AsyncFunction("openNotificationSettings") {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        notifications.areNotificationsEnabled() && notifications.getNotificationChannel(CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE) {
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          .putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID)
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("requestNotificationAccess") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        Permissions.askForPermissionsWithPermissionsManager(
          appContext.permissions, promise, Manifest.permission.POST_NOTIFICATIONS
        )
      } else {
        promise.resolve(null)
      }
    }.runOnQueue(Queues.MAIN)

    Function("recordMilestone") { day: String, animate: Boolean, notify: Boolean, title: String, body: String, channel: String ->
      synchronized(milestoneLock) {
        if (animate && preferences.getString("lastCelebrationDay", null) != day) {
          preferences.edit().putString("lastCelebrationDay", day).putString("pendingCelebration", day).apply()
        }
        if (notify && preferences.getString("lastNotificationDay", null) != day &&
          postNotificationIfAllowed(title, body, channel)) {
          preferences.edit().putString("lastNotificationDay", day).apply()
        }
      }
    }

    Function("takeCelebration") { day: String ->
      synchronized(milestoneLock) {
        val pending = preferences.getString("pendingCelebration", null)
        if (pending != null) preferences.edit().remove("pendingCelebration").apply()
        pending == day
      }
    }
  }

  private fun shouldOnboard(): Boolean {
    when (preferences.getString("onboarding", null)) {
      "complete" -> return false
      "started" -> return true
    }
    // The flags overload requires Android 13. Anki Streak runs on Android 7 and later.
    @Suppress("DEPRECATION")
    val app = context.packageManager.getPackageInfo(context.packageName, 0)
    return app.lastUpdateTime <= app.firstInstallTime
  }

  private fun canPostMilestone(): Boolean =
    notifications.areNotificationsEnabled() &&
      (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
      (Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
        notifications.getNotificationChannel(CHANNEL_ID)?.importance != NotificationManager.IMPORTANCE_NONE)

  private fun postNotificationIfAllowed(title: String, body: String, channel: String): Boolean {
    if (!canPostMilestone()) return false
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("ankistreak://celebration")).setClassName(context.packageName, "${context.packageName}.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val tap = PendingIntent.getActivity(context, CELEBRATION_NOTIFICATION, open, PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL_ID, channel, NotificationManager.IMPORTANCE_DEFAULT))
      if (!canPostMilestone()) return false
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }
    notifications.notify(
      CELEBRATION_NOTIFICATION,
      builder.setSmallIcon(android.R.drawable.star_on).setContentTitle(title).setContentText(body)
        .setContentIntent(tap).setAutoCancel(true).build()
    )
    return true
  }

  private val context get() = requireNotNull(appContext.reactContext)
  private val preferences get() = context.getSharedPreferences("anki-streak-settings", Context.MODE_PRIVATE)
  private val notifications get() = context.getSystemService(NotificationManager::class.java)
}
