package expo.modules.ankiactivity

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

internal const val HISTORY_COLUMNS = 17
internal const val HISTORY_ROWS = 7
internal const val HISTORY_DAYS = HISTORY_COLUMNS * HISTORY_ROWS

internal class ReviewHistory : Record {
  @Field val counts: List<Int> = emptyList()
  @Field val todayRow: Int = 0
}
