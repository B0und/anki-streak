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

    Function("getPreference") { key: String -> preferences.getString(key, null) }

    Function("setPreference") { key: String, value: String ->
      preferences.edit().putString(key, value).apply()
      Unit
    }

    Function("getSystemLanguage") { Resources.getSystem().configuration.locales[0].language }

    Function("getNotificationAccess") { notifications.areNotificationsEnabled() }

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
        if (preferences.getString("lastMilestone", null) != day) {
          preferences.edit().putString("lastMilestone", day)
            .putString("pendingCelebration", if (animate) day else null).apply()
          if (notify && notifications.areNotificationsEnabled() &&
            (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)) {
            postNotification(title, body, channel)
          }
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

  private fun postNotification(title: String, body: String, channel: String) {
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("ankistreak://celebration")).setClassName(context.packageName, "${context.packageName}.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val tap = PendingIntent.getActivity(context, CELEBRATION_NOTIFICATION, open, PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL_ID, channel, NotificationManager.IMPORTANCE_DEFAULT))
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
  }

  private val context get() = requireNotNull(appContext.reactContext)
  private val preferences get() = context.getSharedPreferences("anki-streak-settings", Context.MODE_PRIVATE)
  private val notifications get() = context.getSystemService(NotificationManager::class.java)
}
