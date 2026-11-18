package expo.modules.ankiactivity

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import android.util.AtomicFile
import java.io.File

private const val WIDTH = 1774
private const val HEIGHT = 424
internal const val HISTORY_COLUMNS = 17
internal const val HISTORY_ROWS = 6
internal const val HISTORY_DAYS = HISTORY_COLUMNS * HISTORY_ROWS

internal fun renderWidgetArtwork(
  context: Context,
  streak: Int,
  today: Int,
  history: List<Int>,
  dailyReviewed: Int,
  dailyLearned: Int,
  theme: WidgetTheme
): String {
  val width = minOf(WIDTH, context.resources.displayMetrics.widthPixels)
  val scale = width.toFloat() / WIDTH
  val bitmap = Bitmap.createBitmap(width, (HEIGHT * scale).toInt(), Bitmap.Config.ARGB_8888)

  try {
    val canvas = Canvas(bitmap).apply { scale(scale, scale) }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    val happy = today > 0

    canvas.drawArtwork(
      context,
      if (happy) theme.happy else theme.waiting,
      RectF(1199f, 0f, 1753f, 424f),
      paint
    )
    paint.colorFilter = theme.flameTint?.let { PorterDuffColorFilter(it, PorterDuff.Mode.SRC_IN) }
    canvas.drawArtwork(context, R.drawable.streak_flame, RectF(45f, 164f, 142f, 290f), paint)
    paint.colorFilter = null
    canvas.drawStreak(streak, theme, paint)
    canvas.drawHistory(history, happy, theme, paint)
    canvas.drawCount(dailyReviewed, 652f, false, theme, paint)
    canvas.drawCount(dailyLearned, 902f, true, theme, paint)

    val file = AtomicFile(File(context.filesDir, "anki-streak-widget-${theme.id}.png"))
    val output = file.startWrite()
    try {
      check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output))
      file.finishWrite(output)
    } catch (error: Exception) {
      file.failWrite(output)
      throw error
    }
    return Uri.fromFile(file.baseFile).toString()
  } finally {
    bitmap.recycle()
  }
}

private fun Canvas.drawArtwork(context: Context, resource: Int, destination: RectF, paint: Paint) {
  val artwork = BitmapFactory.decodeResource(context.resources, resource)
  try {
    drawBitmap(artwork, null, destination, paint)
  } finally {
    artwork.recycle()
  }
}

private fun Canvas.drawStreak(streak: Int, theme: WidgetTheme, paint: Paint) {
  val label = streak.toString()
  paint.typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
  paint.textSize = 204f
  if (paint.measureText(label) > 225f) {
    paint.textSize *= 225f / paint.measureText(label)
  }

  val baseline = 227f - (paint.ascent() + paint.descent()) / 2
  paint.style = Paint.Style.STROKE
  paint.strokeJoin = Paint.Join.ROUND
  paint.strokeWidth = 11f
  paint.color = 0xD75C6064.toInt()
  drawText(label, 147f, baseline + 5f, paint)
  paint.strokeWidth = 7f
  paint.color = 0xFFB0B0B0.toInt()
  drawText(label, 147f, baseline, paint)

  paint.style = Paint.Style.FILL
  paint.shader = LinearGradient(0f, 165f, 0f, 300f, theme.streakLight, theme.streakDark, Shader.TileMode.CLAMP)
  drawText(label, 147f, baseline, paint)
  paint.shader = null
}

private fun Canvas.drawHistory(history: List<Int>, happy: Boolean, theme: WidgetTheme, paint: Paint) {
  val activeDays = history.filter { it > 0 }.sorted()
  val thresholds = listOf(45, 72, 90).map { percentile ->
    activeDays.getOrElse(activeDays.lastIndex * percentile / 100) { 0 }
  }

  for (row in 0 until HISTORY_ROWS) {
    for (column in 0 until HISTORY_COLUMNS) {
      val day = row * HISTORY_COLUMNS + column
      val count = history.getOrElse(day) { 0 }
      val intensity = if (count == 0) 0 else 1 + thresholds.count { count > it }

      val x = 393f + 45.8f * column
      val y = 75f + 43.4f * row
      paint.color = if (happy && day == HISTORY_DAYS - 1) theme.accent else theme.heatmap[intensity]
      drawRoundRect(x, y, x + 43f, y + 41f, 11f, 11f, paint)

      if (!happy && day == HISTORY_DAYS - 1) {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 3f
        paint.color = theme.accent
        drawRoundRect(x + 2f, y + 2f, x + 41f, y + 39f, 9f, 9f, paint)
        paint.style = Paint.Style.FILL
      }
    }
  }
}

private fun Canvas.drawCount(count: Int, center: Float, isNew: Boolean, theme: WidgetTheme, paint: Paint) {
  val label = count.toString()
  paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
  paint.textSize = 43f
  val halfWidth = maxOf(73f, (paint.measureText(label) + 88f) / 2)
  paint.color = if (isNew) theme.newBackground else theme.reviewBackground
  drawRoundRect(center - halfWidth, 348f, center + halfWidth, 414f, 34f, 34f, paint)

  val iconX = center - halfWidth + 16f
  paint.color = if (isNew) theme.newForeground else theme.reviewForeground
  if (isNew) {
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 5f
    drawRoundRect(iconX + 8f, 358f, iconX + 45f, 389f, 5f, 5f, paint)
    paint.style = Paint.Style.FILL
    paint.color = theme.newBackground or 0xFF000000.toInt()
    drawRoundRect(iconX, 367f, iconX + 37f, 398f, 5f, 5f, paint)
    paint.color = theme.newForeground
    paint.style = Paint.Style.STROKE
    drawRoundRect(iconX, 367f, iconX + 37f, 398f, 5f, 5f, paint)
    paint.style = Paint.Style.FILL
    drawRoundRect(iconX + 36f, 387f, iconX + 57f, 393f, 2f, 2f, paint)
    drawRoundRect(iconX + 43.5f, 379.5f, iconX + 49.5f, 400.5f, 2f, 2f, paint)
  } else {
    drawRect(iconX, 386f, iconX + 48f, 391f, paint)
    drawRect(iconX + 3f, 379f, iconX + 13f, 399f, paint)
    drawRect(iconX + 19f, 372f, iconX + 29f, 399f, paint)
    drawRect(iconX + 35f, 360f, iconX + 45f, 399f, paint)
  }

  drawText(label, iconX + 61f, 396f, paint)
}
