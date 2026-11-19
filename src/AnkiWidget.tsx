import { Box, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll, size, width as fixedWidth } from '@expo/ui/jetpack-compose/modifiers';
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

type WidgetProps = {
  artwork: WidgetArtwork | null;
  description: string;
  backdrop: string;
  waitingDrawable: string;
  connectLabel?: string;
  card?: { value: string; label: string; secondary: string; accent: string } | null;
};

type AndroidWidgetEnvironment = WidgetEnvironment & { width?: number; height?: number };

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting', connectLabel = 'Open Anki Streak to connect', card }: WidgetProps,
  { width = 300, height = 80 }: AndroidWidgetEnvironment,
) {
  'widget';

  const layout = height >= width * 0.4 ? 'tall' : 'compact';
  const stats = artwork && (layout === 'tall' ? artwork.tallStats : artwork.compactStats);
  const portraitAspect = artwork?.portraitAspect ?? 1;
  const portraitInset = 6;
  const portraitMaxWidth = width * (layout === 'tall' ? 0.58 : 0.38);
  const portraitHeight = Math.max(1, Math.min(height - 4, portraitMaxWidth / portraitAspect));
  const portraitWidth = portraitHeight * portraitAspect;
  const overlap = layout === 'tall' ? Math.min(12, portraitWidth * 0.08) : 0;
  const statsWidth = Math.max(1, width - portraitWidth - portraitInset + (card ? 0 : overlap));
  const statsHeight = stats ? Math.min(height, statsWidth / stats.aspect) : 0;

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(backdrop), cornerRadius(20), { $type: 'openAppOnTap' }]}>
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
              <Column modifiers={[padding(14, 0, 0, 0), fixedWidth(Math.max(1, statsWidth - 14))]}>
                {layout === 'tall' ? <>
                  <Text color="#FFFFFF" style={{ fontSize: 48, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                  <Text color="#FFFFFF" style={{ fontSize: 14 }} maxLines={2}>{card.label}</Text>
                </> : (
                  <Row verticalAlignment="center">
                    <Text color="#FFFFFF" style={{ fontSize: 30, fontWeight: 'bold' }} maxLines={1}>{card.value}</Text>
                    <Text modifiers={[padding(7, 0, 0, 0)]} color="#FFFFFF" style={{ fontSize: 12 }} maxLines={2}>{card.label}</Text>
                  </Row>
                )}
                <Text color={card.accent} style={{ fontSize: layout === 'tall' ? 14 : 12 }} maxLines={1}>{card.secondary}</Text>
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
