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
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

private const val STATS_WIDTH = 1199
private const val COMPACT_STATS_HEIGHT = 424
internal const val HISTORY_COLUMNS = 17
internal const val HISTORY_ROWS = 7
internal const val HISTORY_DAYS = HISTORY_COLUMNS * HISTORY_ROWS

internal class ReviewHistory : Record {
  @Field val counts: List<Int> = emptyList()
  @Field val todayRow: Int = 0
}

internal fun renderWidgetArtwork(
  context: Context,
  streak: Int,
  today: Int,
  history: ReviewHistory,
  dailyReviewed: Int,
  dailyLearned: Int,
  theme: WidgetTheme,
  preview: Boolean,
  russian: Boolean
): Map<String, Any> {
  val prefix = if (preview) "preview-" else ""
  val streakLabel = if (russian) "дней подряд" else "day streak"
  val reviewLabel = if (russian) "Повторов в день" else "Reviews/day"
  val newLabel = if (russian) "Новых в день" else "New/day"
  val compact = writeStats(context, theme, "${prefix}compact", COMPACT_STATS_HEIGHT) { canvas, paint ->
    canvas.drawFlameAndStreak(context, streak, streakLabel, theme, paint)
    canvas.drawHistory(history, today > 0, theme, paint)
    canvas.drawAverage(dailyReviewed, reviewLabel, 393f, 392f, 342f, theme, paint)
    canvas.drawAverage(dailyLearned, newLabel, 788f, 392f, 373f, theme, paint)
  }
  val portrait = if (today > 0) theme.happy else theme.waiting
  val dimensions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeResource(context.resources, portrait, dimensions)

  return mapOf(
    "compactStats" to compact,
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

private fun Canvas.drawFlameAndStreak(context: Context, streak: Int, streakLabel: String, theme: WidgetTheme, paint: Paint) {
  paint.colorFilter = theme.flameTint?.let { PorterDuffColorFilter(it, PorterDuff.Mode.SRC_IN) }
  drawArtwork(context, R.drawable.streak_flame, RectF(45f, 164f, 142f, 290f), paint)
  paint.colorFilter = null
  drawStreak(streak, streakLabel, theme, paint)
}

private fun Canvas.drawArtwork(context: Context, resource: Int, destination: RectF, paint: Paint) {
  val artwork = BitmapFactory.decodeResource(context.resources, resource)
  try {
    drawBitmap(artwork, null, destination, paint)
  } finally {
    artwork.recycle()
  }
}

private fun Canvas.drawStreak(streak: Int, streakLabel: String, theme: WidgetTheme, paint: Paint) {
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
  paint.textSize = 45f
  val labelWidth = paint.measureText(streakLabel)
  if (labelWidth > 225f) paint.textSize *= 225f / labelWidth
  paint.color = theme.streakDark
  drawText(streakLabel, 154f, 311f, paint)
  paint.clearShadowLayer()
}

private fun Canvas.drawHistory(history: ReviewHistory, happy: Boolean, theme: WidgetTheme, paint: Paint) {
  val todaySlot = (HISTORY_COLUMNS - 1) * HISTORY_ROWS + history.todayRow
  val counts = history.counts.takeLast(todaySlot + 1)
  val activeDays = counts.filter { it > 0 }.sorted()
  val thresholds = listOf(45, 72, 90).map { percentile ->
    activeDays.getOrElse(activeDays.lastIndex * percentile / 100) { 0 }
  }

  for (row in 0 until HISTORY_ROWS) {
    for (column in 0 until HISTORY_COLUMNS) {
      val slot = column * HISTORY_ROWS + row
      if (slot > todaySlot) continue
      val count = counts[slot]
      val isToday = slot == todaySlot
      val intensity = if (count == 0) 0 else 1 + thresholds.count { count > it }

      val x = 393f + 45.8f * column
      val y = 75f + 37.2f * row
      paint.color = if (happy && isToday) theme.accent else theme.heatmap[intensity]
      drawRoundRect(x, y, x + 43f, y + 35f, 9f, 9f, paint)

      if (!happy && isToday) {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 3f
        paint.color = theme.accent
        drawRoundRect(x + 2f, y + 2f, x + 41f, y + 33f, 7f, 7f, paint)
        paint.style = Paint.Style.FILL
      }
    }
  }
}

private fun Canvas.drawAverage(
  count: Int,
  label: String,
  x: Float,
  baseline: Float,
  maxWidth: Float,
  theme: WidgetTheme,
  paint: Paint
) {
  val number = count.toString()
  paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
  paint.textSize = 52f
  val naturalWidth = paint.measureText(number)
  val numberWidth = minOf(naturalWidth, maxWidth * .48f)
  if (naturalWidth > numberWidth) paint.textSize *= numberWidth / naturalWidth
  paint.color = theme.streakLight
  paint.setShadowLayer(9f, 0f, 2f, 0xCC000000.toInt())
  drawText(number, x, baseline, paint)

  paint.typeface = Typeface.create("sans-serif", Typeface.NORMAL)
  paint.textSize = 50f
  val labelWidth = paint.measureText(label)
  val available = maxWidth - numberWidth - 14f
  if (labelWidth > available) paint.textSize *= available / labelWidth
  paint.color = theme.streakDark
  drawText(label, x + numberWidth + 14f, baseline, paint)
  paint.clearShadowLayer()
}
