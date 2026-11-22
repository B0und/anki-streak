import { Box, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetCard = {
  value: string;
  label: string;
  secondary: string;
  accent: `#${string}`;
  shortLabel?: string;
  shortSecondary?: string;
  averages?: string;
  pulse?: {
    shade: string;
    muted: string;
    metrics: ReadonlyArray<{ label: string; value: string; icon: string }>;
  };
  quests?: {
    completed: number;
    total: number;
    goals: ReadonlyArray<{ label: string; value: string; fraction: number }>;
  };
  days?: ReadonlyArray<{ label: string; state: 'reviewed' | 'missed' | 'today' | 'today-reviewed' | 'future' }>;
};

export type WidgetProps = {
  happy?: boolean;
  description: string;
  backdrop: string;
  waitingDrawable: string;
  happyDrawable?: string;
  portraitAspect?: { waiting: number; happy: number };
  connectLabel?: string;
  cards?: { compact?: WidgetCard; tall?: WidgetCard };
  cardBackdrop?: string;
};

type AndroidWidgetEnvironment = WidgetEnvironment & {
  width?: number;
  height?: number;
  sizeClass?: 'compact' | 'tall';
  previewMood?: 'live' | 'waiting' | 'happy';
};

function AnkiStreak(
  { happy, backdrop, waitingDrawable, happyDrawable, portraitAspect, cards, cardBackdrop,
    connectLabel = 'Open Anki Streak to connect' }: WidgetProps,
  { width: widgetWidth = 300, height = 80, sizeClass: layout = 'compact', previewMood }: AndroidWidgetEnvironment,
) {
  'widget';

  const card = cards?.[layout];
  const tall = layout === 'tall';
  const narrow = widgetWidth < 240;
  const portraitHappy = previewMood === 'happy' || (previewMood !== 'waiting' && happy);
  const portrait = portraitHappy ? happyDrawable ?? waitingDrawable : waitingDrawable;
  const aspect = (portraitHappy ? portraitAspect?.happy : portraitAspect?.waiting) ?? 1;
  const margin = narrow ? 10 : 16;
  const questFooter = tall && card?.quests && height >= 126 ? (narrow ? 44 : 52) : 0;
  const weekGap = narrow ? 7 : 10;
  const weekBarGap = narrow ? 5 : 6;
  const weekFooter = tall && card?.days ? (narrow ? 36 : 46) : 0;
  const available = height - questFooter - weekFooter;
  const short = (card?.quests ? available : height) < 100;
  const stacked = tall && available >= Math.max(230, widgetWidth * 0.82);
  const textHeight = stacked ? available * 0.42 : available;
  const weekTextWidth = Math.floor((widgetWidth - 2 * margin - 8) * 0.48);
  const imageWidthLimit = weekFooter
    ? widgetWidth - 2 * margin - weekTextWidth - 8
    : widgetWidth * (stacked ? 0.88 : tall ? (card?.quests ? 0.55 : 0.59) : 0.46);
  const imageHeightLimit = stacked && !weekFooter ? available - textHeight : available - 10;
  const imageHeight = Math.max(1, Math.min(imageHeightLimit, (imageWidthLimit - (weekFooter ? 0 : 6)) / aspect));
  const imageWidth = imageHeight * aspect;
  const textWidth = Math.max(1, widgetWidth - (stacked ? margin : imageWidthLimit) - margin);
  const questCompleted = card?.quests?.completed ?? 0;
  const questSegmentWidth = Math.max(6, Math.min(24, Math.floor(textWidth / (card?.quests?.total ?? 1)) - 4));
  const numberMax = tall ? (narrow ? 42 : 64) : short ? 34 : 52;
  const valueSize = Math.min(numberMax, textWidth / Math.max(1, (card?.value.length ?? 1) * 0.63), textHeight * (short ? card?.averages ? 0.29 : 0.35 : 0.45));
  const labelSize = narrow || short ? 11 : 15;
  const weekLabelSize = Math.min(labelSize, weekTextWidth / Math.max(1, (card?.label.length ?? 1) * 0.55));
  const streakSize = Math.min(narrow ? 14 : 18, weekTextWidth / Math.max(1, (card?.secondary.length ?? 1) * 0.51));
  const weekMetricArea = available - Math.ceil(streakSize * 1.25) - weekGap - 4;
  const weekValueSize = Math.max(1, Math.min(numberMax, weekTextWidth / Math.max(1, (card?.value.length ?? 1) * 0.63),
    (weekMetricArea - weekLabelSize * 1.3) / 1.08));
  // The caption overlaps the empty space at the bottom of the native number's line box.
  const weekLabelTop = Math.ceil(weekValueSize);
  const weekPitch = (Math.round(widgetWidth) - 2 * margin + weekBarGap) / 7;
  const surface = cardBackdrop ?? backdrop;
  const actions = previewMood ? [] : [{ $type: 'openAppOnTap' }];

  const pulse = card?.pulse;
  if (card && pulse) {
    const inset = narrow ? 8 : 12;
    const rail = Math.floor(Math.min(widgetWidth * .30, height * 1.15));
    const contentWidth = widgetWidth - rail - inset;
    const footerHeight = Math.round(height * .35);
    const metricWidth = contentWidth / pulse.metrics.length;
    const longestLabel = Math.max(...pulse.metrics.map(({ label }) => label.length));
    const longestValue = Math.max(...pulse.metrics.map(({ value }) => value.length));
    const detailLabelSize = Math.min(10, height * .12, (metricWidth - 3) / (longestLabel * .72));
    const detailValueSize = Math.min(15, height * .17, (metricWidth - (narrow ? 2 : 13)) / (longestValue * .62));
    const portraitHeight = Math.min(height - inset, (rail - inset) / aspect);
    const numberSize = Math.min(height * .43, contentWidth * .45 / (card.value.length * .62));
    const captionWidth = contentWidth - Math.ceil(numberSize * card.value.length * .65) - 6;
    return <Box modifiers={[fillMaxSize(), cornerRadius(20), ...actions]} contentAlignment="bottomStart">
      <Column>
        <Box contentAlignment="centerStart" modifiers={[size(widgetWidth, height - footerHeight), background(surface),
          padding(rail, 0, inset, 0)]}>
          <Row verticalAlignment="bottom">
            <Text color="#FFFDF8" style={{ fontSize: numberSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
            <Text color={pulse.muted} modifiers={[width(captionWidth), padding(6, 0, 0, Math.floor(numberSize * .16))]}
              style={{ fontSize: Math.min(12, height * .16, (captionWidth - 6) / (card.label.length * .54)) }}
              maxLines={1}>{card.label}</Text>
          </Row>
        </Box>
        <Row verticalAlignment="center" modifiers={[size(widgetWidth, footerHeight), background(pulse.shade), padding(rail, 0, inset, 0)]}>
          {pulse.metrics.map(({ label, value, icon }) => (
            <Column key={icon} modifiers={[width(metricWidth)]}>
              <Text color={pulse.muted} modifiers={[width(metricWidth - 3)]}
                style={{ fontSize: detailLabelSize }} maxLines={1}>{label}</Text>
              <Row verticalAlignment="center">
                {!narrow && <Image source={{ uri: icon }} tint={pulse.muted} modifiers={[size(11, 11), padding(0, 0, 2, 0)]} />}
                <Text color={card.accent} style={{ fontSize: detailValueSize, fontWeight: '500' }} maxLines={1}>{value}</Text>
              </Row>
            </Column>
          ))}
        </Row>
      </Column>
      <Box contentAlignment="bottomCenter" modifiers={[size(rail, portraitHeight)]}>
        <Image source={{ uri: portrait }} contentScale="fit" modifiers={[size(rail - inset, portraitHeight)]} />
      </Box>
    </Box>;
  }

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...actions]}>
      {card ? (
        <Column>
          <Box modifiers={[size(widgetWidth, available)]} contentAlignment="topStart">
            <Box modifiers={[fillMaxSize(), padding(0, 0, weekFooter ? margin : 6, 0)]} contentAlignment="bottomEnd">
              <Image source={{ uri: portrait }} contentScale="fit" modifiers={[size(imageWidth, imageHeight)]} />
            </Box>
            {weekFooter > 0 ? <Box modifiers={[fillMaxSize()]} contentAlignment="topStart">
              <Box modifiers={[size(widgetWidth, weekMetricArea), padding(margin, 0, 0, 0)]} contentAlignment="centerStart">
                <Box modifiers={[size(weekTextWidth, weekLabelTop + Math.ceil(weekLabelSize * 1.3))]} contentAlignment="topStart">
                  <Text color="#FFFDF8" style={{ fontSize: weekValueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                  <Text color="#BDB5AB" style={{ fontSize: weekLabelSize }}
                    modifiers={[padding(0, weekLabelTop, 0, 0)]} maxLines={1}>
                    {card.label.toLowerCase()}
                  </Text>
                </Box>
              </Box>
              <Box modifiers={[fillMaxSize(), padding(margin, 0, 0, weekGap)]} contentAlignment="bottomStart">
                <Text color={card.accent} style={{ fontSize: streakSize, fontWeight: 'bold' }}
                  modifiers={[width(weekTextWidth)]} maxLines={1}>{card.secondary}</Text>
              </Box>
            </Box> : <Box modifiers={[size(widgetWidth, textHeight), padding(margin, 0, 0, 0)]} contentAlignment="centerStart">
              <Column modifiers={[width(textWidth)]}>
                <Text color="#FFFDF8" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                <Text color="#DDD7CF" style={{ fontSize: labelSize }} maxLines={narrow && !short ? 2 : 1}>
                  {narrow && short ? card.shortLabel ?? card.label : card.label}
                </Text>
                {card.quests ? (
                  <Row modifiers={[padding(0, short ? 4 : 7, 0, 0)]}>
                    {Array.from({ length: card.quests.total }, (_, index) => (
                      <Box key={index} modifiers={[padding(0, 0, 4, 0)]}>
                        <Box modifiers={[
                          size(questSegmentWidth, short ? 4 : 5),
                          background(index < questCompleted ? card.accent : card.accent + '37'),
                          cornerRadius(2),
                        ]} />
                      </Box>
                    ))}
                  </Row>
                ) : <Text color={card.accent} style={{ fontSize: short ? 11 : narrow ? 14 : 18, fontWeight: 'bold' }}
                  modifiers={[padding(0, short ? 4 : 12, 0, 0)]} maxLines={short ? 1 : 2}>
                  {narrow && short ? card.shortSecondary ?? card.secondary : card.secondary}
                </Text>}
                {card.averages && !weekFooter && <Text color="#DDD7CF" style={{ fontSize: 10 }}
                  modifiers={[padding(0, short ? 0 : 4, 0, 0)]} maxLines={1}>{card.averages}</Text>}
              </Column>
            </Box>}
          </Box>
          {questFooter > 0 && card.quests && <Column>
            <Box modifiers={[size(widgetWidth, 1), background(card.accent + '33')]} />
            <Row horizontalArrangement="center" verticalAlignment="center" modifiers={[size(widgetWidth, questFooter - 1)]}>
              {card.quests.goals.map(({ label, value, fraction }) => {
                const goalWidth = Math.floor((widgetWidth - 2 * margin) / 2);
                const track = goalWidth - 12;
                const filled = Math.round(track * fraction);
                return <Column key={label} modifiers={[width(goalWidth), padding(6, 0, 6, 0)]}>
                  <Row verticalAlignment="center" modifiers={[width(track)]}>
                    <Text color="#DDD7CF" style={{ fontSize: narrow ? 10 : 13 }} maxLines={1}>{label}</Text>
                    <Text color={card.accent} style={{ fontSize: narrow ? 10 : 13, fontWeight: 'bold' }}
                      modifiers={[padding(6, 0, 0, 0)]} maxLines={1}>{value}</Text>
                  </Row>
                  <Box modifiers={[padding(0, 5, 0, 0)]}>
                    <Box contentAlignment="centerStart" modifiers={[size(track, 4), background(card.accent + '37'), cornerRadius(2)]}>
                      {filled > 0 && <Box modifiers={[size(filled, 4), background(card.accent), cornerRadius(2)]} />}
                    </Box>
                  </Box>
                </Column>;
              })}
            </Row>
          </Column>}
          {weekFooter > 0 && card.days && <Column>
            <Box modifiers={[size(widgetWidth, 1), background(card.accent + '33')]} />
            <Row verticalAlignment="top" modifiers={[size(widgetWidth, weekFooter - 1), padding(margin, weekGap, margin, 0)]}>
              {card.days.map(({ label, state }, index) => {
                const gap = index === 6 ? 0 : weekBarGap;
                const dayWidth = Math.round((index + 1) * weekPitch) - Math.round(index * weekPitch) - weekBarGap;
                const current = state === 'today' || state === 'today-reviewed';
                const reviewed = state === 'reviewed' || state === 'today-reviewed';
                const fill = reviewed ? card.accent : state === 'future' ? card.accent + '1A' : card.accent + '44';
                return <Box key={label} modifiers={[padding(0, 0, gap, 0)]}>
                  <Column horizontalAlignment="center" modifiers={[width(dayWidth)]}>
                    <Box contentAlignment="center" modifiers={[size(dayWidth, 5), background(current ? card.accent : fill)]}>
                      {state === 'today' && <Box modifiers={[size(dayWidth - 2, 3), background(surface)]} />}
                    </Box>
                    <Text color={current ? '#D4CCC0' : '#BDB5AB'}
                      style={{ fontSize: narrow ? 9 : 11, fontWeight: current ? 'bold' : 'normal' }}
                      modifiers={[padding(0, 4, 0, 0)]} maxLines={1}>{label.toLowerCase()}</Text>
                  </Column>
                </Box>;
              })}
            </Row>
          </Column>}
        </Column>
      ) : (
        <Row verticalAlignment="center" modifiers={[width(Math.min(260, widgetWidth - 16))]}>
          <Image source={{ uri: portrait }} contentScale="fit" modifiers={[size(narrow ? 49 : 65, 48)]} />
          <Text color="#FFFDF8" modifiers={[padding(8, 0, 0, 0)]} style={{ fontSize: 13 }} maxLines={3}>{connectLabel}</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget<WidgetProps>('AnkiStreak', AnkiStreak, {
  description: '', backdrop: '#0D2025', waitingDrawable: 'miku_waiting',
});
