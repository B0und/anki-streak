import { Box, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  height,
  padding,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { WidgetActivity } from './activity';

function AnkiStreak({ mood, streak, today, history }: WidgetActivity) {
  'widget';

  const happy = mood === 'happy';
  const linked = mood !== 'unlinked';
  const accent = '#72F5DD';
  const backgroundColor = '#0D1E24';
  const cellColors = ['#1C3A40', '#275C5B', '#337E73', '#42AE99', '#70EAD0'];

  return (
    <Box modifiers={[fillMaxSize(), background(backgroundColor), cornerRadius(22)]}>
      <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize()]}>
        <Image
          source={{ uri: happy ? 'miku_happy' : 'miku_waiting' }}
          contentScale="fit"
          contentDescription={happy ? 'Miku is cheering' : 'Miku is waiting'}
          modifiers={[size(184, 145)]}
        />
      </Box>
      <Box contentAlignment="centerStart" modifiers={[fillMaxSize(), padding(17, 0, 0, 0)]}>
        <Column>
          <Text color={accent} style={{ fontSize: 11, fontWeight: 'bold' }} maxLines={1}>ANKI STREAK</Text>
          <Row verticalAlignment="center" modifiers={[padding(0, 2, 0, 3)]}>
            {linked && (
              <Image source={{ uri: 'streak_flame' }} modifiers={[size(22, 27), padding(0, 0, 3, 0)]} />
            )}
            <Text color="#F2FEFC" style={{ fontSize: 32, fontWeight: 'bold' }} maxLines={1}>
              {linked ? streak.toString() : '—'}
            </Text>
            <Text color="#A4BFC1" style={{ fontSize: 12 }} modifiers={[padding(5, 0, 0, 0)]} maxLines={1}>
              {streak === 1 ? 'day' : 'days'}
            </Text>
          </Row>
          <Column>
            {Array.from({ length: 5 }, (_, row) => (
              <Row key={row}>
                {Array.from({ length: 9 }, (_, column) => {
                  const day = row * 9 + column;
                  const count = history[day] ?? 0;
                  const intensity = count === 0 ? 0 : count < 5 ? 1 : count < 20 ? 2 : count < 50 ? 3 : 4;
                  const color = day === 44 ? (happy ? accent : '#42696A') : cellColors[intensity];
                  return (
                    <Box key={column} modifiers={[size(16, 10)]}>
                      <Box modifiers={[size(13, 7), background(color ?? '#1C3A40'), cornerRadius(2)]} />
                    </Box>
                  );
                })}
              </Row>
            ))}
          </Column>
          <Spacer modifiers={[height(5)]} />
          <Text color={happy ? accent : '#A4BFC1'} style={{ fontSize: 11 }} maxLines={1}>
            {linked ? `${today} ${today === 1 ? 'card' : 'cards'} today` : 'Open Anki Streak to connect'}
          </Text>
        </Column>
      </Box>
    </Box>
  );
}

export default createWidget('AnkiStreak', AnkiStreak, {
  mood: 'unlinked',
  streak: 0,
  today: 0,
  history: [],
});
