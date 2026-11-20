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
  connectLabel?: string;
  cards?: { compact?: WidgetCard; tall?: WidgetCard };
  tallCurrent?: TallCurrent;
  cardBackdrop?: string;
  previewSize?: 'compact' | 'tall';
};

type AndroidWidgetEnvironment = WidgetEnvironment & { width?: number; height?: number; screenHeight?: number };

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting', connectLabel = 'Open Anki Streak to connect', cards, tallCurrent, cardBackdrop, previewSize }: WidgetProps,
  { width: widgetWidth = 300, height = 80, screenHeight = 0 }: AndroidWidgetEnvironment,
) {
  'widget';

  const minimumTallHeight = 105;
  const compactScreenFraction = 0.24;
  const layout = previewSize ?? (height >= Math.max(minimumTallHeight, screenHeight * compactScreenFraction) ? 'tall' : 'compact');
  const card = cards?.[layout];
  const narrow = widgetWidth < 240;
  const short = height < 78;
  const tallOverview = layout === 'tall' && !card ? tallCurrent : undefined;
  const surface = card || tallOverview ? cardBackdrop ?? backdrop : backdrop;
  const openApp = previewSize ? [] : [{ $type: 'openAppOnTap' }];
  if (artwork && tallOverview) {
    const { value, label, streak, accent, days } = tallOverview;
    const footerHeight = narrow ? 36 : 44;
    const heroHeight = height - footerHeight;
    const inset = narrow ? 8 : 13;
    const portraitPanelWidth = Math.round(widgetWidth * 0.53);
    const portraitHeight = Math.min(heroHeight, Math.round(portraitPanelWidth * 1.27));
    const tallyWidth = widgetWidth - portraitPanelWidth - inset;
    const tallySize = Math.min(narrow || heroHeight < 90 ? 32 : 52, tallyWidth / Math.max(1, value.length * 0.62));
    const dayWidth = Math.floor((widgetWidth - inset * 2) / 7);
    const markWidth = dayWidth - (narrow ? 4 : 7);
    const markHeight = narrow ? 7 : 9;
    const empty = accent + '33';

    return (
      <Box modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...openApp]}>
        <Column modifiers={[fillMaxSize()]}>
          <Box modifiers={[size(widgetWidth, heroHeight)]}>
            <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize()]}>
              <Image source={{ uri: artwork.portraitDrawable }} contentScale="crop"
                modifiers={[size(portraitPanelWidth, portraitHeight)]} />
            </Box>
            <Box contentAlignment="centerStart" modifiers={[fillMaxSize(), padding(inset, 0, 0, 0)]}>
              <Column modifiers={[width(tallyWidth)]}>
                <Text color="#FFFFFF" style={{ fontSize: tallySize, fontWeight: 'bold' }} maxLines={1}>{value}</Text>
                <Text color="#FFFFFF" style={{ fontSize: narrow ? 10 : 13 }} maxLines={2}>{label}</Text>
                <Text color={accent} style={{ fontSize: narrow ? 10 : 12, fontWeight: 'bold' }}
                  modifiers={[padding(0, heroHeight < 90 ? 3 : 8, 0, 0)]} maxLines={2}>{streak}</Text>
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
                  <Box contentAlignment="center" modifiers={[size(markWidth, markHeight), background(current ? accent : fill), cornerRadius(2)]}>
                    {state === 'today' && <Box modifiers={[size(markWidth - 2, markHeight - 2), background('#20282C'), cornerRadius(1)]} />}
                  </Box>
                  <Text color={current ? accent : '#FFFFFF'} style={{ fontSize: narrow ? 9 : 11 }}
                    modifiers={[padding(0, 3, 0, 0)]} maxLines={1}>{day}</Text>
                </Column>
              );
            })}
          </Row>
        </Column>
      </Box>
    );
  }

  const stats = artwork?.compactStats;
  const portraitAspect = artwork?.portraitAspect ?? 1;
  const portraitInset = 6;
  const portraitMaxWidth = widgetWidth * (layout === 'tall' ? (narrow && card ? 0.44 : 0.53) : 0.36);
  const portraitHeight = Math.max(1, Math.min(height - 4, portraitMaxWidth / portraitAspect));
  const portraitWidth = portraitHeight * portraitAspect;
  const statsWidth = Math.max(1, widgetWidth - portraitWidth - portraitInset);
  const statsHeight = stats ? Math.min(height, statsWidth / stats.aspect) : 0;
  const cardInset = narrow ? 10 : 16;
  const inlineCard = layout === 'compact' && !narrow;
  const valueSize = layout === 'tall' ? (narrow ? 36 : 46) : (short ? 24 : 31);
  const labelSize = narrow || short ? 11 : 13;

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(surface), cornerRadius(20), ...openApp]}>
      {artwork && stats ? (
        <>
          <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize(), padding(0, 0, portraitInset, 0)]}>
            <Image
              source={{ uri: artwork.portraitDrawable }}
              contentScale="fit"
              modifiers={[size(portraitWidth, portraitHeight)]}
            />
          </Box>
          <Box contentAlignment="centerStart" modifiers={[fillMaxSize()]}>
            {card ? (
              <Box modifiers={[padding(cardInset, 0, 0, 0)]}>
                <Column modifiers={[width(Math.max(1, statsWidth - cardInset))]}>
                  {inlineCard ? (
                    <Row verticalAlignment="center">
                      <Text color="#FFFFFF" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                      <Text modifiers={[padding(8, 0, 0, 0)]} color="#FFFFFF" style={{ fontSize: labelSize }} maxLines={2}>{card.label}</Text>
                    </Row>
                  ) : <>
                    {layout === 'tall' && <Text color={card.accent} style={{ fontSize: labelSize, fontWeight: '500' }} maxLines={narrow ? 1 : 2}>{narrow ? card.shortLabel ?? card.label : card.label}</Text>}
                    <Text color="#FFFFFF" style={{ fontSize: valueSize, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                    {layout === 'compact' && <Text color="#FFFFFF" style={{ fontSize: labelSize }} maxLines={1}>{card.shortLabel ?? card.label}</Text>}
                  </>}
                  <Text color={layout === 'tall' ? '#FFFFFF' : card.accent}
                    modifiers={short ? [] : [padding(0, 4, 0, 0)]} style={{ fontSize: labelSize }} maxLines={1}>
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
          <Image source={{ uri: waitingDrawable }} contentScale="fit" modifiers={[size(narrow ? 49 : 65, 48)]} />
          <Text color="#FFFFFF" modifiers={[padding(8, 0, 0, 0)]} style={{ fontSize: 13 }} maxLines={3}>{connectLabel}</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget<WidgetProps>('AnkiStreak', AnkiStreak, {
  artwork: null, description: '', backdrop: '#000000', waitingDrawable: 'miku_waiting',
});
