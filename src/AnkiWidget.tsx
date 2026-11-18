import { Box, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
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

  const tall = height >= width * 0.4;
  const stats = artwork && (tall ? artwork.tallStats : artwork.compactStats);
  const portraitHeight = Math.max(1, height - 4);
  const portraitWidth = Math.min(portraitHeight * (artwork?.portraitAspect ?? 1), width * (tall ? 0.42 : 0.34));
  const statsWidth = width - portraitWidth;
  const statsHeight = stats ? Math.min(height, statsWidth / stats.aspect) : 0;

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(backdrop), cornerRadius(20), { $type: 'openAppOnTap' }]}>
      {artwork && stats ? (
        <>
          <Box contentAlignment="centerStart" modifiers={[fillMaxSize()]}>
            <Image
              source={{ uri: stats.uri }}
              contentDescription={description}
              contentScale="fit"
              modifiers={[size(statsWidth, statsHeight)]}
            />
          </Box>
          <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize()]}>
            <Image
              source={{ uri: artwork.portraitDrawable }}
              contentScale="crop"
              modifiers={[size(portraitWidth, portraitHeight)]}
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
