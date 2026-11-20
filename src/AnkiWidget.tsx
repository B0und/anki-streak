import { Box, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, size, width } from '@expo/ui/jetpack-compose/modifiers';
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

export type WidgetCard = {
  value: string;
  label: string;
  secondary: string;
  accent: string;
  shortLabel?: string;
  shortSecondary?: string;
};

export type WidgetProps = {
  artwork: WidgetArtwork | null;
  description: string;
  backdrop: string;
  waitingDrawable: string;
  connectLabel?: string;
  cards?: { compact?: WidgetCard; tall?: WidgetCard };
  cardBackdrop?: string;
  previewSize?: 'compact' | 'tall';
};

type AndroidWidgetEnvironment = WidgetEnvironment & { width?: number; height?: number; screenHeight?: number };

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting', connectLabel = 'Open Anki Streak to connect', cards, cardBackdrop, previewSize }: WidgetProps,
  { width: widgetWidth = 300, height = 80, screenHeight = 0 }: AndroidWidgetEnvironment,
) {
  'widget';

  const minimumTallHeight = 105;
  const compactScreenFraction = 0.24;
  const layout = previewSize ?? (height >= Math.max(minimumTallHeight, screenHeight * compactScreenFraction) ? 'tall' : 'compact');
  const card = cards?.[layout];
  const narrow = widgetWidth < 240;
  const short = height < 78;
  const stats = artwork && (layout === 'tall' ? artwork.tallStats : artwork.compactStats);
  const portraitAspect = artwork?.portraitAspect ?? 1;
  const portraitInset = 6;
  const portraitMaxWidth = widgetWidth * (layout === 'tall' ? (narrow && card ? 0.44 : 0.53) : 0.36);
  const portraitHeight = Math.max(1, Math.min(height - 4, portraitMaxWidth / portraitAspect));
  const portraitWidth = portraitHeight * portraitAspect;
  const overlap = layout === 'tall' ? Math.min(12, portraitWidth * 0.08) : 0;
  const stackedArtwork = layout === 'tall' && !card && height >= widgetWidth * 0.84;
  const statsInset = stackedArtwork ? 14 : 0;
  const statsWidth = stackedArtwork
    ? widgetWidth - 2 * statsInset
    : Math.max(1, widgetWidth - portraitWidth - portraitInset + (card ? 0 : overlap));
  const availableHeight = stackedArtwork ? Math.max(1, height - portraitHeight - statsInset) : height;
  const statsHeight = stats ? Math.min(availableHeight, statsWidth / stats.aspect) : 0;
  const cardInset = narrow ? 10 : 16;
  const inlineCard = layout === 'compact' && !narrow;
  const valueSize = layout === 'tall' ? (narrow ? 36 : 46) : (short ? 24 : 31);
  const labelSize = narrow || short ? 11 : 13;

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(card ? cardBackdrop ?? backdrop : backdrop), cornerRadius(20), ...(previewSize ? [] : [{ $type: 'openAppOnTap' }])]}>
      {artwork && stats ? (
        <>
          <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize(), padding(0, 0, portraitInset, 0)]}>
            <Image
              source={{ uri: artwork.portraitDrawable }}
              contentScale="fit"
              modifiers={[size(portraitWidth, portraitHeight)]}
            />
          </Box>
          <Box contentAlignment={stackedArtwork ? 'topStart' : 'centerStart'}
            modifiers={stackedArtwork ? [fillMaxSize(), padding(statsInset, statsInset, 0, 0)] : [fillMaxSize()]}>
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
