import { Box, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
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
};

type AndroidWidgetEnvironment = WidgetEnvironment & { width?: number; height?: number };

function AnkiStreak(
  { artwork, description, backdrop = '#000000', waitingDrawable = 'miku_waiting' }: WidgetProps,
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
  const statsWidth = Math.max(1, width - portraitWidth - portraitInset + overlap);
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
            <Image
              source={{ uri: stats.uri }}
              contentDescription={description}
              contentScale="fit"
              modifiers={[size(statsWidth, statsHeight)]}
            />
          </Box>
        </>
      ) : (
        <Row verticalAlignment="center">
          <Image source={{ uri: waitingDrawable }} modifiers={[size(69, 51)]} />
          <Text color="#FFFFFF" modifiers={[paddingAll(8)]}>Open Anki Streak to connect</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget<WidgetProps>('AnkiStreak', AnkiStreak, {
  artwork: null, description: '', backdrop: '#000000', waitingDrawable: 'miku_waiting',
});
