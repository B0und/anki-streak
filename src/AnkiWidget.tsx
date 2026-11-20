import { Box, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type WidgetImage = {
  uri: string;
  aspect: number;
};

export type WidgetArtwork = {
  compactStats: WidgetImage;
  portraitDrawable: string;
  portraitAspect: number;
  alternatePortraitAspect?: number;
};

export type WidgetCard = {
  value: string;
  label: string;
  secondary: string;
  accent: string;
  shortLabel?: string;
  shortSecondary?: string;
};

export type TallCurrent = {
  value: string;
  label: string;
  streak: string;
  accent: `#${string}`;
  days: ReadonlyArray<{ label: string; state: 'reviewed' | 'missed' | 'today' | 'today-reviewed' | 'future' }>;
};

export type WidgetProps = {
  artwork: WidgetArtwork | null;
  description: string;
  backdrop: string;
  waitingDrawable: string;
  happyDrawable?: string;
  connectLabel?: string;
  cards?: { compact?: WidgetCard; tall?: WidgetCard };
  tallCurrent?: TallCurrent;
  cardBackdrop?: string;
};

type AndroidWidgetEnvironment = WidgetEnvironment & {
  width?: number;
  height?: number;
  sizeClass?: 'compact' | 'tall';
  previewMood?: 'live' | 'waiting' | 'happy';
};

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting', happyDrawable,
    connectLabel = 'Open Anki Streak to connect', cards, tallCurrent, cardBackdrop }: WidgetProps,
  { width: widgetWidth = 300, height = 80, sizeClass: layout = 'compact', previewMood }: AndroidWidgetEnvironment,
) {
  'widget';

  const card = cards?.[layout];
  const narrow = widgetWidth < 240;
  const short = height < 78;
  const tallOverview = layout === 'tall' && !card ? tallCurrent : undefined;
  const surface = card || tallOverview ? cardBackdrop ?? backdrop : backdrop;
  const openApp = previewMood ? [] : [{ $type: 'openAppOnTap' }];
  const livePortrait = artwork?.portraitDrawable ?? waitingDrawable;
  const portrait = previewMood === 'happy' ? happyDrawable ?? livePortrait
    : previewMood === 'waiting' ? waitingDrawable : livePortrait;
  const portraitAspect = (portrait === livePortrait ? undefined : artwork?.alternatePortraitAspect)
    ?? artwork?.portraitAspect ?? 1;
  const portraitInset = 6;
  const inset = narrow ? 10 : 16;
  const labelSize = narrow || short ? 11 : 13;
  if (artwork && tallOverview) {
    const { value, label, streak, accent, days } = tallOverview;
    const footerHeight = narrow ? 36 : 44;
    const heroHeight = height - footerHeight;
    const portraitPanelWidth = Math.round(widgetWidth * 0.53);
    const portraitHeight = Math.max(1, Math.min(heroHeight - portraitInset, (portraitPanelWidth - portraitInset) / portraitAspect));
    const tallyWidth = widgetWidth - portraitPanelWidth - inset;
    const tallySize = Math.min(narrow || heroHeight < 104 ? 32 : 44, tallyWidth / Math.max(1, value.length * 0.62));
    const dayWidth = Math.floor((widgetWidth - inset * 2) / 7);
    const markWidth = dayWidth - (narrow ? 5 : 9);
    const markHeight = narrow ? 5 : 7;
    const empty = accent + '33';

    return (
      <Box modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...openApp]}>
        <Column modifiers={[fillMaxSize()]}>
          <Box modifiers={[size(widgetWidth, heroHeight)]}>
            <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize(), padding(0, 0, portraitInset, 0)]}>
              <Image source={{ uri: portrait }} contentScale="fit"
                modifiers={[size(portraitHeight * portraitAspect, portraitHeight)]} />
            </Box>
            <Box contentAlignment="centerStart" modifiers={[fillMaxSize(), padding(inset, 0, 0, 0)]}>
              <Column modifiers={[width(tallyWidth)]}>
                <Text color="#FFFFFF" style={{ fontSize: tallySize, fontWeight: 'bold' }} maxLines={1}>{value}</Text>
                <Text color="#FFFFFF" style={{ fontSize: labelSize, fontWeight: '500' }} maxLines={2}>{label}</Text>
                <Text color={accent} style={{ fontSize: labelSize, fontWeight: '500' }}
                  modifiers={[padding(0, heroHeight < 104 ? 4 : 7, 0, 0)]} maxLines={2}>{streak}</Text>
              </Column>
            </Box>
          </Box>
          <Box modifiers={[size(widgetWidth, 1), background(empty)]} />
          <Row horizontalArrangement="center" verticalAlignment="center" modifiers={[size(widgetWidth, footerHeight - 1)]}>
            {days.map(({ label: day, state }) => {
              const current = state === 'today' || state === 'today-reviewed';
              const reviewed = state === 'reviewed' || state === 'today-reviewed';
              const fill = reviewed ? accent : state === 'future' ? accent + '1A' : empty;
              return (
                <Column key={day} horizontalAlignment="center" modifiers={[width(dayWidth)]}>
                  <Box contentAlignment="center" modifiers={[size(markWidth, markHeight), background(current ? accent : fill)]}>
                    {state === 'today' && <Box modifiers={[size(markWidth - 2, markHeight - 2), background(surface)]} />}
                  </Box>
                  <Text color={current ? accent : '#FFFFFF'} style={{ fontSize: narrow ? 9 : 11, fontWeight: current ? '500' : 'normal' }}
                    modifiers={[padding(0, 4, 0, 0)]} maxLines={1}>{day}</Text>
                </Column>
              );
            })}
          </Row>
        </Column>
      </Box>
    );
  }

  const stats = artwork?.compactStats;
  const portraitMaxWidth = widgetWidth * (layout === 'tall' ? (narrow && card ? 0.44 : 0.53) : 0.36);
  const portraitHeight = Math.max(1, Math.min(height - portraitInset, portraitMaxWidth / portraitAspect));
  const portraitWidth = portraitHeight * portraitAspect;
  const statsWidth = Math.max(1, widgetWidth - portraitWidth - portraitInset);
  const statsHeight = stats ? Math.min(height, statsWidth / stats.aspect) : 0;
  const cardWidth = Math.max(1, statsWidth - inset);
  const inlineCard = layout === 'compact' && short && !narrow;
  const valueMax = layout === 'tall' ? (narrow ? 32 : 44) : (short ? 24 : 32);
  const valueWidth = inlineCard ? cardWidth * 0.50 : cardWidth;
  const valueSize = Math.min(valueMax, valueWidth / Math.max(1, (card?.value.length ?? 1) * 0.62));

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...openApp]}>
      {artwork && stats ? (
        <>
          <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize(), padding(0, 0, portraitInset, 0)]}>
            <Image
              source={{ uri: portrait }}
              contentScale="fit"
              modifiers={[size(portraitWidth, portraitHeight)]}
            />
          </Box>
          <Box contentAlignment="centerStart" modifiers={[fillMaxSize()]}>
            {card ? (
              <Box modifiers={[padding(inset, 0, 0, 0)]}>
                <Column modifiers={[width(cardWidth)]}>
                  {inlineCard ? (
                    <Row verticalAlignment="center">
                      <Text color="#FFFFFF" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                      <Text modifiers={[padding(6, 0, 0, 0)]} color="#FFFFFF" style={{ fontSize: labelSize, fontWeight: '500' }} maxLines={2}>{card.label}</Text>
                    </Row>
                  ) : <>
                    <Text color="#FFFFFF" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                    <Text color="#FFFFFF" style={{ fontSize: labelSize, fontWeight: '500' }} maxLines={short ? 1 : 2}>
                      {narrow && short ? card.shortLabel ?? card.label : card.label}
                    </Text>
                  </>}
                  <Text color={card.accent}
                    modifiers={[padding(0, short ? 2 : 6, 0, 0)]} style={{ fontSize: labelSize, fontWeight: '500' }} maxLines={short ? 1 : 2}>
                    {narrow ? card.shortSecondary ?? card.secondary : card.secondary}
                  </Text>
                </Column>
              </Box>
            ) : <Image
              source={{ uri: stats.uri }}
              contentDescription={description}
              contentScale="fit"
              modifiers={[size(statsHeight * stats.aspect, statsHeight)]}
            />}
          </Box>
        </>
      ) : (
        <Row verticalAlignment="center" modifiers={[width(Math.min(260, widgetWidth - 16))]}>
          <Image source={{ uri: portrait }} contentScale="fit" modifiers={[size(narrow ? 49 : 65, 48)]} />
          <Text color="#FFFFFF" modifiers={[padding(8, 0, 0, 0)]} style={{ fontSize: 13 }} maxLines={3}>{connectLabel}</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget<WidgetProps>('AnkiStreak', AnkiStreak, {
  artwork: null, description: '', backdrop: '#000000', waitingDrawable: 'miku_waiting',
});
