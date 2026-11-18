import { Box, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

type WidgetProps = {
  imageUri: string;
  description: string;
  backdrop: string;
  waitingDrawable: string;
};

function AnkiStreak({ imageUri, description, backdrop = '#00000000', waitingDrawable = 'miku_waiting' }: WidgetProps) {
  'widget';

  return (
    <Box contentAlignment="center" modifiers={[fillMaxSize(), background(backdrop), cornerRadius(20), { $type: 'openAppOnTap' }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          contentDescription={description}
          contentScale="fit"
          modifiers={[fillMaxSize()]}
        />
      ) : (
        <Row verticalAlignment="center">
          <Image source={{ uri: waitingDrawable }} modifiers={[size(69, 51)]} />
          <Text color="#FFFFFF" modifiers={[paddingAll(8)]}>Open Anki Streak to connect</Text>
        </Row>
      )}
    </Box>
  );
}

export default createWidget('AnkiStreak', AnkiStreak, {
  imageUri: '', description: '', backdrop: '#00000000', waitingDrawable: 'miku_waiting',
});
