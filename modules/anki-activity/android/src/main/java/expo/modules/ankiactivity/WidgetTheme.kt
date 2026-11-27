package expo.modules.ankiactivity

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

internal enum class WidgetTheme(val id: String, val happyPortrait: Int) {
  MIKU("miku", R.drawable.miku_happy),
  TWO_B("2b", R.drawable.twob_happy),
  EMILIA("emilia", R.drawable.emilia_happy),
  RUDEUS("rudeus", R.drawable.rudeus_happy),
  ROXY("roxy", R.drawable.roxy_happy),
  SYLPHIETTE("sylphiette", R.drawable.sylphiette_happy),
  ERIS("eris", R.drawable.eris_happy),
  RUIJERD("ruijerd", R.drawable.ruijerd_happy);

  companion object {
    fun fromId(id: String?): WidgetTheme = entries.firstOrNull { it.id == id } ?: MIKU

    fun selected(context: Context): WidgetTheme = fromId(preferences(context).getString("theme", null))

    fun preferences(context: Context) = context.getSharedPreferences("anki-streak-widget", Context.MODE_PRIVATE)
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
