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
  val reviewBackground: Int,
  val reviewForeground: Int,
  val newBackground: Int,
  val newForeground: Int,
  val flameTint: Int? = null
) {
  MIKU(
    "miku", R.drawable.miku_waiting, R.drawable.miku_happy,
    colors("#0A5048", "#096255", "#078577", "#0AAE9B", "#1DD6C1"), color("#22E6CE"),
    Color.WHITE, color("#E5E7EA"),
    color("#E13A4242"), color("#A6AEAF"), color("#E1274658"), color("#6099C8")
  ),
  TWO_B(
    "2b", R.drawable.twob_waiting, R.drawable.twob_happy,
    colors("#393633", "#514B45", "#756D63", "#A79C8C", "#D8CDB8"), color("#F3EBD9"),
    color("#FFFCF0"), color("#D8CDB8"),
    color("#E13F3933"), color("#DAD0BE"), color("#E14F4539"), color("#ECD8B7"), color("#DDC8A4")
  ),
  EMILIA(
    "emilia", R.drawable.emilia_waiting, R.drawable.emilia_happy,
    colors("#40305E", "#593B81", "#794DB0", "#A471E6", "#D8B6FF"), color("#E9CBFF"),
    color("#FAF1FF"), color("#CFACFF"),
    color("#E14B3866"), color("#E0C8FF"), color("#E161407A"), color("#F0C7FA"), color("#DAAAFF")
  );

  companion object {
    fun fromId(id: String?): WidgetTheme = entries.firstOrNull { it.id == id } ?: MIKU
  }
}

private fun color(value: String): Int = Color.parseColor(value)
private fun colors(vararg values: String): IntArray = values.map(::color).toIntArray()

internal fun updateLauncherIcon(context: Context, theme: WidgetTheme) {
  val packageName = context.packageName
  val settings = WidgetTheme.entries.map { candidate ->
    val component = ComponentName(packageName, "$packageName.Launcher_${candidate.id}")
    val state = if (candidate == theme) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED
    } else {
      PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    }
    component to state
  }
  val manager = context.packageManager
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
