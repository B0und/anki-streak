package expo.modules.ankiactivity

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.util.AtomicFile
import java.io.File

private const val STATS_WIDTH = 1199
private const val COMPACT_STATS_HEIGHT = 424
private const val TALL_STATS_HEIGHT = 840
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
): Map<String, Any> {
  val compact = writeStats(context, theme, "compact", COMPACT_STATS_HEIGHT) { canvas, paint ->
    canvas.drawFlameAndStreak(context, streak, theme, paint)
    canvas.drawHistory(history, today > 0, theme, paint)
    canvas.drawCount(dailyReviewed, 652f, false, theme, paint)
    canvas.drawCount(dailyLearned, 902f, true, theme, paint)
  }
  val tall = writeStats(context, theme, "tall", TALL_STATS_HEIGHT) { canvas, paint ->
    canvas.save()
    canvas.translate(66f, -102f)
    canvas.scale(1.5f, 1.5f)
    canvas.drawFlameAndStreak(context, streak, theme, paint)
    canvas.restore()

    canvas.save()
    canvas.translate(906f, 116f)
    canvas.scale(1.65f, 1.65f)
    canvas.drawCount(dailyReviewed, 0f, false, theme, paint, centerY = 33f, maxWidth = 290f)
    canvas.drawCount(dailyLearned, 0f, true, theme, paint, centerY = 115f, maxWidth = 290f)
    canvas.restore()

    canvas.save()
    canvas.translate(30f, 420f)
    canvas.scale(1.44f, 1.44f)
    canvas.translate(-393f, -75f)
    canvas.drawHistory(history, today > 0, theme, paint)
    canvas.restore()
  }
  val portrait = if (today > 0) theme.happy else theme.waiting
  val dimensions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeResource(context.resources, portrait, dimensions)

  return mapOf(
    "compactStats" to compact,
    "tallStats" to tall,
    "portraitDrawable" to context.resources.getResourceEntryName(portrait),
    "portraitAspect" to dimensions.outWidth.toDouble() / dimensions.outHeight
  )
}

private fun writeStats(
  context: Context,
  theme: WidgetTheme,
  layout: String,
  height: Int,
  draw: (Canvas, Paint) -> Unit
): Map<String, Any> {
  val width = minOf(STATS_WIDTH, context.resources.displayMetrics.widthPixels)
  val scale = width.toFloat() / STATS_WIDTH
  val bitmap = Bitmap.createBitmap(width, (height * scale).toInt(), Bitmap.Config.ARGB_8888)

  try {
    val canvas = Canvas(bitmap).apply { scale(scale, scale) }
    draw(canvas, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))

    val file = AtomicFile(File(context.filesDir, "anki-streak-${theme.id}-$layout.png"))
    val output = file.startWrite()
    try {
      check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output))
      file.finishWrite(output)
    } catch (error: Exception) {
      file.failWrite(output)
      throw error
    }
    return mapOf("uri" to Uri.fromFile(file.baseFile).toString(), "aspect" to STATS_WIDTH.toDouble() / height)
  } finally {
    bitmap.recycle()
  }
}

private fun Canvas.drawFlameAndStreak(context: Context, streak: Int, theme: WidgetTheme, paint: Paint) {
  paint.colorFilter = theme.flameTint?.let { PorterDuffColorFilter(it, PorterDuff.Mode.SRC_IN) }
  drawArtwork(context, R.drawable.streak_flame, RectF(45f, 164f, 142f, 290f), paint)
  paint.colorFilter = null
  drawStreak(streak, theme, paint)
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
  paint.style = Paint.Style.FILL
  paint.typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
  paint.textSize = 192f
  val digitWidth = paint.measureText(label)
  if (digitWidth > 225f) paint.textSize *= 225f / digitWidth
  paint.color = theme.streakLight
  paint.setShadowLayer(11f, 0f, 2f, 0xCC000000.toInt())
  drawText(label, 147f, 262f, paint)

  paint.typeface = Typeface.create("sans-serif", Typeface.NORMAL)
  paint.textSize = 37f
  paint.color = theme.streakDark
  drawText("day streak", 154f, 311f, paint)
  paint.clearShadowLayer()
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

private fun Canvas.drawCount(
  count: Int,
  center: Float,
  isNew: Boolean,
  theme: WidgetTheme,
  paint: Paint,
  centerY: Float = 381f,
  maxWidth: Float = 232f
) {
  val label = count.toString()
  val availableTextWidth = maxWidth - 88f
  paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
  paint.textSize = 43f
  val textWidth = paint.measureText(label)
  if (textWidth > availableTextWidth) paint.textSize *= availableTextWidth / textWidth
  val halfWidth = maxOf(73f, (paint.measureText(label) + 88f) / 2)
  save()
  translate(0f, centerY - 381f)
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

  val baseline = 381f - (paint.ascent() + paint.descent()) / 2
  drawText(label, iconX + 61f, baseline, paint)
  restore()
}
