package expo.modules.ankiactivity

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

private const val ANKI_PACKAGE = "com.ichi2.anki"
private const val ANKI_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE"
private const val PROVIDER = "com.ichi2.anki.flashcards"
private val CARDS_URI = Uri.parse("content://$PROVIDER/cards")
private const val AVERAGE_DAYS = 30

class AnkiActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnkiActivity")

    AsyncFunction("requestPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, ANKI_PERMISSION)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("readActivity") {
      readActivity(context)
    }

    AsyncFunction("renderWidget") { streak: Int, today: Int, history: List<Int>, dailyReviewed: Int, dailyLearned: Int ->
      renderWidgetArtwork(context, streak, today, history, dailyReviewed, dailyLearned)
    }

    AsyncFunction("openAnki") {
      val intent = context.packageManager.getLaunchIntentForPackage(ANKI_PACKAGE)
      if (intent != null) {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      intent != null
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pinWidget") {
      val manager = AppWidgetManager.getInstance(context)
      val provider = ComponentName(context.packageName, "${context.packageName}.AnkiStreakProvider")
      manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(provider, null, null)
    }.runOnQueue(Queues.MAIN)
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private fun readActivity(context: Context): Map<String, Any?> {
    if (context.packageManager.resolveContentProvider(PROVIDER, 0) == null) {
      return mapOf("kind" to "missing")
    }
    if (context.checkSelfPermission(ANKI_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
      return mapOf("kind" to "permission")
    }

    return try {
      val recent = (0 until HISTORY_DAYS).map { daysAgo -> reviewedCards(context, daysAgo) }
      var day = if (recent.first() > 0) 0 else 1
      val start = day

      while (recent.getOrElse(day) { reviewedCards(context, day) } > 0) {
        day++
      }

      val dailyReviewed = recent.drop(1).take(AVERAGE_DAYS).average().roundToInt()
      val introduced = countCards(context, "introduced:${AVERAGE_DAYS + 1} -introduced:1")
      val dailyLearned = (introduced.toDouble() / AVERAGE_DAYS).roundToInt()

      mapOf(
        "kind" to "ready",
        "today" to recent.first(),
        "streak" to day - start,
        "history" to recent.reversed(),
        "dailyReviewed" to dailyReviewed,
        "dailyLearned" to dailyLearned
      )
    } catch (_: SecurityException) {
      mapOf("kind" to "permission")
    } catch (_: IllegalArgumentException) {
      mapOf("kind" to "unsupported")
    }
  }

  private fun reviewedCards(context: Context, daysAgo: Int): Int =
    countCards(context, "prop:rated=${-daysAgo}")

  private fun countCards(context: Context, search: String): Int {
    // The provider passes its selection through to Anki's browser search.
    return context.contentResolver.query(CARDS_URI, arrayOf("_id"), search, null, null)
      ?.use { it.count }
      ?: error("AnkiDroid did not return a card cursor")
  }
}
