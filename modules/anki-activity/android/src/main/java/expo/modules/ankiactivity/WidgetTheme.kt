package expo.modules.ankiactivity

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

internal enum class WidgetTheme(val id: String) {
  MIKU("miku"),
  TWO_B("2b"),
  EMILIA("emilia");

  companion object {
    fun fromId(id: String?): WidgetTheme = entries.firstOrNull { it.id == id } ?: MIKU
  }
}

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
