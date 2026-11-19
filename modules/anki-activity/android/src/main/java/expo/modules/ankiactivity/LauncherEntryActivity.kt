package expo.modules.ankiactivity

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class LauncherEntryActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startActivity(
      Intent().setClassName(packageName, "$packageName.MainActivity")
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
    finish()
  }
}
