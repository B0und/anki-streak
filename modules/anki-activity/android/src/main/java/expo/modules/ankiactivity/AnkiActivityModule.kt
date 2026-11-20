package expo.modules.ankiactivity

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar
import kotlin.math.roundToInt

private const val ANKI_PACKAGE = "com.ichi2.anki"
private const val ANKI_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE"
private const val PROVIDER = "com.ichi2.anki.flashcards"
private val CARDS_URI = Uri.parse("content://$PROVIDER/cards")
private val DECKS_URI = Uri.parse("content://$PROVIDER/decks")
private const val DUE_REVIEWS = "is:due -is:suspended -is:buried"
private const val DUE_REVIEW_EXCLUDED_DECKS = "dueReviewExcludedDecks"
private const val AVERAGE_DAYS = 30
private const val DEFAULT_DAY_ROLLOVER_HOUR = 4
private val themeLock = Any()

class AnkiActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnkiActivity")

    Constant("historyRows") { HISTORY_ROWS }
    Constant("historyColumns") { HISTORY_COLUMNS }

    Function("getWidgetTheme") {
      storedWidgetTheme().id
    }

    Function("setWidgetTheme") { id: String ->
      val theme = WidgetTheme.fromId(id)
      synchronized(themeLock) {
        if (theme != storedWidgetTheme()) {
          check(widgetPreferences.edit().putString("theme", theme.id).commit())
        }
        reconcileWidgetIcon(theme)
      }
    }

    Function("getWidgetBackgroundTransparency") {
      widgetPreferences.getInt("backgroundTransparency", 0)
    }

    Function("setWidgetBackgroundTransparency") { value: Int ->
      widgetPreferences.edit().putInt("backgroundTransparency", value.coerceIn(0, 100)).apply()
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, ANKI_PERMISSION)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("readActivity") {
      synchronized(themeLock) { reconcileWidgetIcon(storedWidgetTheme()) }
      readActivity(context)
    }

    AsyncFunction("readDecks") {
      readDecks(context)
    }

    Function("getDueReviewExcludedDecks") {
      excludedDeckIds().toList()
    }

    Function("setDueReviewExcludedDecks") { ids: List<String> ->
      widgetPreferences.edit().putStringSet(DUE_REVIEW_EXCLUDED_DECKS, ids.toSet()).apply()
    }

    AsyncFunction("openAnki") {
      val intent = context.packageManager.getLaunchIntentForPackage(ANKI_PACKAGE)
      if (intent == null) {
        "missing"
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        "opened"
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pinWidget") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@AsyncFunction "use-picker"
      val manager = AppWidgetManager.getInstance(context)
      val provider = ComponentName(context.packageName, "${context.packageName}.AnkiStreakProvider")
      if (manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(provider, null, null)) {
        "requested"
      } else {
        "use-picker"
      }
    }.runOnQueue(Queues.MAIN)
  }

  private fun storedWidgetTheme(): WidgetTheme =
    WidgetTheme.fromId(widgetPreferences.getString("theme", null))

  private fun reconcileWidgetIcon(theme: WidgetTheme) {
    runCatching { reconcileLauncherIcon(context, theme) }
      .onFailure { Log.w("AnkiActivity", "Launcher icon reconciliation failed", it) }
  }

  private val widgetPreferences
    get() = context.getSharedPreferences("anki-streak-widget", Context.MODE_PRIVATE)

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
      val studyDate = Calendar.getInstance()
      if (studyDate.get(Calendar.HOUR_OF_DAY) < DEFAULT_DAY_ROLLOVER_HOUR) {
        studyDate.add(Calendar.DAY_OF_MONTH, -1)
      }
      val weekday = studyDate.get(Calendar.DAY_OF_WEEK)
      val todayRow = (weekday + HISTORY_ROWS - Calendar.MONDAY) % HISTORY_ROWS
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
        "newToday" to countCards(context, "introduced:1"),
        "dueReviews" to countDueReviews(context, excludedDeckIds()),
        "streak" to day - start,
        "history" to mapOf("counts" to recent.reversed(), "todayRow" to todayRow),
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

  private fun excludedDeckIds(): Set<String> =
    widgetPreferences.getStringSet(DUE_REVIEW_EXCLUDED_DECKS, null) ?: emptySet()

  private fun readDecks(context: Context): List<Map<String, String>> {
    val cursor = context.contentResolver.query(DECKS_URI, arrayOf("deck_id", "deck_name"), null, null, null)
      ?: error("AnkiDroid did not return a deck cursor")
    return cursor.use {
      buildList {
        while (it.moveToNext()) {
          add(mapOf("id" to it.getString(0), "name" to it.getString(1)))
        }
      }
    }
  }

  private fun countDueReviews(context: Context, excluded: Set<String>): Int {
    if (excluded.isEmpty()) return countCards(context, DUE_REVIEWS)
    val cursor = context.contentResolver.query(
      CARDS_URI, arrayOf("deck_id", "original_deck_id"), DUE_REVIEWS, null, null
    ) ?: error("AnkiDroid did not return a card cursor")
    return cursor.use {
      var count = 0
      while (it.moveToNext()) {
        if (it.getString(0) !in excluded && it.getString(1) !in excluded) count++
      }
      count
    }
  }

  private fun countCards(context: Context, search: String): Int {
    // The provider passes its selection through to Anki's browser search.
    return context.contentResolver.query(CARDS_URI, arrayOf("_id"), search, null, null)
      ?.use { it.count }
      ?: error("AnkiDroid did not return a card cursor")
  }
}
