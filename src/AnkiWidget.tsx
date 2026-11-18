import { Box, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

type WidgetProps = {
  imageUri: string;
  description: string;
};

function AnkiStreak({ imageUri, description }: WidgetProps) {
  'widget';

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        contentDescription={description}
        contentScale="fit"
        modifiers={[fillMaxSize()]}
      />
    );
  }

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize()]}>
      <Row verticalAlignment="center">
        <Image source={{ uri: 'miku_waiting' }} modifiers={[size(69, 51)]} />
        <Text color="#FFFFFF" modifiers={[paddingAll(8)]}>Open Anki Streak to connect</Text>
      </Row>
    </Box>
  );
}

export default createWidget('AnkiStreak', AnkiStreak, { imageUri: '', description: '' });
