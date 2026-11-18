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
import org.json.JSONArray

private const val ANKI_PACKAGE = "com.ichi2.anki"
private const val ANKI_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE"
private const val PROVIDER = "com.ichi2.anki.flashcards"
private val CARDS_URI = Uri.parse("content://$PROVIDER/cards")
private val DECKS_URI = Uri.parse("content://$PROVIDER/decks")

class AnkiActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnkiActivity")

    AsyncFunction("requestPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, ANKI_PERMISSION)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("readActivity") {
      readActivity(context)
    }

    AsyncFunction("renderWidget") { streak: Int?, today: Int?, history: List<Int>, due: Int?, newCards: Int? ->
      renderWidgetArtwork(context, streak, today, history, due, newCards)
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

      val (due, newCards) = remainingCards(context)

      mapOf(
        "kind" to "ready",
        "today" to recent.first(),
        "streak" to day - start,
        "history" to recent.reversed(),
        "due" to due,
        "newCards" to newCards
      )
    } catch (_: SecurityException) {
      mapOf("kind" to "permission")
    } catch (_: IllegalArgumentException) {
      mapOf("kind" to "unsupported")
    }
  }

  private fun remainingCards(context: Context): Pair<Int?, Int?> {
    return runCatching {
      context.contentResolver.query(DECKS_URI, arrayOf("deck_name", "deck_count"), null, null, null)
        ?.use { cursor ->
          var due = 0
          var newCards = 0
          while (cursor.moveToNext()) {
            val name = cursor.getString(0)
            if (name.isEmpty() || "::" in name) continue

            // Parent-deck counts already include their subdecks.
            val counts = JSONArray(cursor.getString(1))
            due += counts.getInt(0) + counts.getInt(1)
            newCards += counts.getInt(2)
          }
          due to newCards
        }
    }.getOrNull() ?: (null to null)
  }

  private fun reviewedCards(context: Context, daysAgo: Int): Int {
    // The provider passes its selection through to Anki's browser search.
    val day = -daysAgo
    return context.contentResolver.query(CARDS_URI, arrayOf("_id"), "prop:rated=$day", null, null)
      ?.use { it.count }
      ?: error("AnkiDroid did not return a card cursor")
  }
}
