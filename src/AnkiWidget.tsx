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
  const short = height < 100;
  const portraitHappy = previewMood === 'happy' || (previewMood !== 'waiting' && happy);
  const portrait = portraitHappy ? happyDrawable ?? waitingDrawable : waitingDrawable;
  const aspect = (portraitHappy ? portraitAspect?.happy : portraitAspect?.waiting) ?? 1;
  const margin = narrow ? 10 : 16;
  const footer = tall && card?.days ? (narrow ? 34 : 42) : 0;
  const available = height - footer;
  const stacked = tall && available >= Math.max(230, widgetWidth * 0.82);
  const textHeight = stacked ? available * 0.42 : available;
  const imageWidthLimit = widgetWidth * (stacked ? 0.88 : tall ? 0.59 : 0.46);
  const imageHeightLimit = stacked ? available - textHeight : available - 10;
  const imageHeight = Math.max(1, Math.min(imageHeightLimit, (imageWidthLimit - 6) / aspect));
  const imageWidth = imageHeight * aspect;
  const textWidth = Math.max(1, widgetWidth - (stacked ? margin : imageWidthLimit) - margin);
  const numberMax = tall ? (narrow ? 42 : 64) : short ? 34 : 52;
  const valueSize = Math.min(numberMax, textWidth / Math.max(1, (card?.value.length ?? 1) * 0.63), textHeight * (short ? card?.averages ? 0.29 : 0.35 : 0.45));
  const labelSize = narrow || short ? 11 : 15;
  const surface = cardBackdrop ?? backdrop ?? '#000000';
  const actions = previewMood ? [] : [{ $type: 'openAppOnTap' }];

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...actions]}>
      {card ? (
        <Column>
          <Box modifiers={[size(widgetWidth, available)]} contentAlignment="topStart">
            <Box modifiers={[fillMaxSize(), padding(0, 0, 6, 0)]} contentAlignment="bottomEnd">
              <Image source={{ uri: portrait }} contentScale="fit" modifiers={[size(imageWidth, imageHeight)]} />
            </Box>
            <Box modifiers={[size(widgetWidth, textHeight), padding(margin, 0, 0, 0)]} contentAlignment="centerStart">
              <Column modifiers={[width(textWidth)]}>
                <Text color="#FFFDF8" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                <Text color="#DDD7CF" style={{ fontSize: labelSize }} maxLines={narrow && !short ? 2 : 1}>
                  {narrow && short ? card.shortLabel ?? card.label : card.label}
                </Text>
                <Text color={card.accent} style={{ fontSize: short ? 11 : narrow ? 14 : 18, fontWeight: 'bold' }}
                  modifiers={[padding(0, short ? 4 : 12, 0, 0)]} maxLines={short ? 1 : 2}>
                  {narrow && short ? card.shortSecondary ?? card.secondary : card.secondary}
                </Text>
                {card.averages && !footer && <Text color="#DDD7CF" style={{ fontSize: 10 }}
                  modifiers={[padding(0, short ? 0 : 4, 0, 0)]} maxLines={1}>{card.averages}</Text>}
              </Column>
            </Box>
          </Box>
          {footer > 0 && card.days && <Column>
            <Box modifiers={[size(widgetWidth, 1), background(card.accent + '33')]} />
            <Row horizontalArrangement="center" verticalAlignment="center" modifiers={[size(widgetWidth, footer - 1)]}>
              {card.days.map(({ label, state }) => {
                const dayWidth = Math.floor((widgetWidth - 2 * margin) / 7);
                const current = state === 'today' || state === 'today-reviewed';
                const reviewed = state === 'reviewed' || state === 'today-reviewed';
                const fill = reviewed ? card.accent : state === 'future' ? card.accent + '1A' : card.accent + '44';
                return <Column key={label} horizontalAlignment="center" modifiers={[width(dayWidth)]}>
                  <Box contentAlignment="center" modifiers={[size(dayWidth - 6, current ? 6 : 4), background(current ? card.accent : fill)]}>
                    {state === 'today' && <Box modifiers={[size(dayWidth - 8, 4), background(surface)]} />}
                  </Box>
                  <Text color={current ? card.accent : '#FFFDF8'} style={{ fontSize: narrow ? 9 : 11, fontWeight: current ? 'bold' : 'normal' }}
                    modifiers={[padding(0, 4, 0, 0)]} maxLines={1}>{label}</Text>
                </Column>;
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
  description: '', backdrop: '#000000', waitingDrawable: 'miku_waiting',
});
