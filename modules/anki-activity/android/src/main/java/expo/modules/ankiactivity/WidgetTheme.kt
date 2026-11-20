package expo.modules.ankiactivity

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build

internal enum class WidgetTheme(
  val id: String,
  val waiting: Int,
  val happy: Int,
  val heatmap: IntArray,
  val accent: Int,
  val streakLight: Int,
  val streakDark: Int,
  val flameTint: Int? = null
) {
  MIKU(
    "miku", R.drawable.miku_waiting, R.drawable.miku_happy,
    colors("#0A5048", "#096255", "#078577", "#0AAE9B", "#1DD6C1"), color("#22E6CE"),
    Color.WHITE, color("#E5E7EA")
  ),
  TWO_B(
    "2b", R.drawable.twob_waiting, R.drawable.twob_happy,
    colors("#393633", "#514B45", "#756D63", "#A79C8C", "#D8CDB8"), color("#F3EBD9"),
    color("#FFFCF0"), color("#D8CDB8"), color("#DDC8A4")
  ),
  EMILIA(
    "emilia", R.drawable.emilia_waiting, R.drawable.emilia_happy,
    colors("#40305E", "#593B81", "#794DB0", "#A471E6", "#D8B6FF"), color("#E9CBFF"),
    color("#FAF1FF"), color("#CFACFF"), color("#DAAAFF")
  );

  companion object {
    fun fromId(id: String?): WidgetTheme = entries.firstOrNull { it.id == id } ?: MIKU
  }
}

private fun color(value: String): Int = Color.parseColor(value)
private fun colors(vararg values: String): IntArray = values.map(::color).toIntArray()

internal fun reconcileLauncherIcon(context: Context, theme: WidgetTheme) {
  val packageName = context.packageName
  val manager = context.packageManager
  val settings = WidgetTheme.entries.mapNotNull { candidate ->
    val component = ComponentName(packageName, "$packageName.Launcher_${candidate.id}")
    val state = if (candidate == theme) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED
    } else {
      PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    }
    val current = manager.getComponentEnabledSetting(component)
    val enabled = when (current) {
      PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> candidate == WidgetTheme.MIKU
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      else -> false
    }
    if (enabled == (candidate == theme)) null else component to state
  }
  if (settings.isEmpty()) return
  val flags = PackageManager.DONT_KILL_APP
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    manager.setComponentEnabledSettings(settings.map { (component, state) ->
      PackageManager.ComponentEnabledSetting(component, state, flags)
    })
  } else {
    // Enable the replacement first so the launcher always has an entry.
    settings.sortedBy { (_, state) -> state }.forEach { (component, state) ->
      manager.setComponentEnabledSetting(component, state, flags)
    }
  }
}
