import { Box, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type WidgetImage = {
  uri: string;
  aspect: number;
};

export type WidgetArtwork = {
  compactStats: WidgetImage;
  tallStats: WidgetImage;
  portraitDrawable: string;
  portraitAspect: number;
};

type WidgetCard = {
  value: string;
  label: string;
  secondary: string;
  accent: string;
  shortLabel?: string;
  shortSecondary?: string;
};

type WidgetProps = {
  artwork: WidgetArtwork | null;
  description: string;
  backdrop: string;
  waitingDrawable: string;
  connectLabel?: string;
  card?: WidgetCard | null;
  cards?: { compact?: WidgetCard; tall?: WidgetCard };
  cardBackdrop?: string;
};

type AndroidWidgetEnvironment = WidgetEnvironment & { width?: number; height?: number; screenHeight?: number };

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting', connectLabel = 'Open Anki Streak to connect', card: legacyCard, cards, cardBackdrop }: WidgetProps,
  { width: widgetWidth = 300, height = 80, screenHeight = 0 }: AndroidWidgetEnvironment,
) {
  'widget';

  const minimumTallHeight = 105;
  const compactScreenFraction = 0.24;
  const layout = height >= Math.max(minimumTallHeight, screenHeight * compactScreenFraction) ? 'tall' : 'compact';
  const card = cards ? cards[layout] : legacyCard;
  const narrow = widgetWidth < 240;
  const stats = artwork && (layout === 'tall' ? artwork.tallStats : artwork.compactStats);
  const portraitAspect = artwork?.portraitAspect ?? 1;
  const portraitInset = 6;
  const portraitMaxWidth = widgetWidth * (layout === 'tall' ? (narrow && card ? 0.48 : 0.58) : 0.38);
  const portraitHeight = Math.max(1, Math.min(height - 4, portraitMaxWidth / portraitAspect));
  const portraitWidth = portraitHeight * portraitAspect;
  const overlap = layout === 'tall' ? Math.min(12, portraitWidth * 0.08) : 0;
  const statsWidth = Math.max(1, widgetWidth - portraitWidth - portraitInset + (card ? 0 : overlap));
  const statsHeight = stats ? Math.min(height, statsWidth / stats.aspect) : 0;

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(card ? cardBackdrop ?? backdrop : backdrop), cornerRadius(20), { $type: 'openAppOnTap' }]}>
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
              <Column modifiers={[padding(14, 0, 0, 0), width(Math.max(1, statsWidth - 14))]}>
                {layout === 'tall' || narrow ? <>
                  <Text color="#FFFFFF" style={{ fontSize: layout === 'tall' ? 48 : 23, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                  <Text color="#FFFFFF" style={{ fontSize: narrow ? 11 : 14 }} maxLines={narrow ? 1 : 2}>{narrow ? card.shortLabel ?? card.label : card.label}</Text>
                </> : (
                  <Row verticalAlignment="center">
                    <Text color="#FFFFFF" style={{ fontSize: 30, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                    <Text modifiers={[padding(7, 0, 0, 0)]} color="#FFFFFF" style={{ fontSize: 12 }} maxLines={2}>{card.label}</Text>
                  </Row>
                )}
                <Text color={card.accent} style={{ fontSize: narrow ? 11 : layout === 'tall' ? 14 : 12 }} maxLines={1}>{narrow ? card.shortSecondary ?? card.secondary : card.secondary}</Text>
              </Column>
            ) : <Image
              source={{ uri: stats.uri }}
              contentDescription={description}
              contentScale="fit"
              modifiers={[size(statsWidth, statsHeight)]}
            />}
          </Box>
        </>
      ) : (
        <Row verticalAlignment="center">
          <Image source={{ uri: waitingDrawable }} modifiers={[size(69, 51)]} />
          <Text color="#FFFFFF" modifiers={[paddingAll(8)]}>{connectLabel}</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget<WidgetProps>('AnkiStreak', AnkiStreak, {
  artwork: null, description: '', backdrop: '#000000', waitingDrawable: 'miku_waiting',
});
