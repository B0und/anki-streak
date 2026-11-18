import { Box, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

type WidgetProps = {
  imageUri: string;
  description: string;
  opacity: number;
};

function AnkiStreak({ imageUri, description, opacity = 1 }: WidgetProps) {
  'widget';

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), { $type: 'openAppOnTap' }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          contentDescription={description}
          contentScale="fit"
          alpha={opacity}
          modifiers={[fillMaxSize()]}
        />
      ) : (
        <Row verticalAlignment="center">
          <Image source={{ uri: 'miku_waiting' }} alpha={opacity} modifiers={[size(69, 51)]} />
          <Text color="#FFFFFF" modifiers={[paddingAll(8)]}>Open Anki Streak to connect</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget('AnkiStreak', AnkiStreak, {
  imageUri: '', description: '', opacity: 1,
});
