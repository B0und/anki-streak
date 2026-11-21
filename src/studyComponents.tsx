import { useActor } from '@xstate/react';
import type { ReactNode } from 'react';
import { Button, Image, Text, View, XStack, YStack } from 'tamagui';

import { countUpMachine } from './countUpMachine';

export function Action({ children, onPress, primary, disabled }: {
  children: ReactNode; onPress(): void; primary?: boolean; disabled?: boolean;
}) {
  return (
    <Button size={false} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
      minH={48} maxW="100%" px={16} py={10} justify="center" rounded={12}
      bg={primary ? 'accent' : 'subtle'} opacity={disabled ? .55 : 'press:0.75'}>
      <Text color={primary ? 'on-accent' : 'color'} fontWeight="600" text="center">{children}</Text>
    </Button>
  );
}

export function Choices<T extends string>({ choices, value, onChange, label }: {
  choices: readonly T[]; value: T; onChange(value: T): void; label(value: T): string;
}) {
  return (
    <XStack accessibilityRole="radiogroup" bg="subtle" p={4} gap={4} rounded={13}>
      {choices.map((choice) => {
        const checked = value === choice;
        return <View key={choice} accessibilityRole="radio" accessibilityState={{ checked }}
          onPress={() => onChange(choice)} flex={1} minH={48} justify="center" items="center"
          px={3} rounded={10} bg={checked ? 'surface' : 'transparent'} opacity="press:0.75">
          <Text color={checked ? 'accent' : 'muted'} fontWeight="700" text="center">{label(choice)}</Text>
        </View>;
      })}
    </XStack>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack bg="surface" borderColor="border-color" borderWidth={1} rounded={16} p={15} gap={12}>
      <Text accessibilityRole="header" color="color" fontWeight="700" fontSize={18}>{title}</Text>
      {children}
    </YStack>
  );
}

function AnimatedCount({ value, delay }: { value: number; delay: number }) {
  const [snapshot] = useActor(countUpMachine, { input: { value, delay } });
  return snapshot.context.value;
}

export function CountUp({ value, delay, celebration }: {
  value: number | undefined; delay: number; celebration: number;
}) {
  if (value === undefined) return '—';
  if (!celebration) return value;
  return <AnimatedCount key={value} value={value} delay={delay} />;
}

export function Portrait({ drawable, aspect, height, maxWidth }: {
  drawable: string; aspect: number; height: number; maxWidth: number;
}) {
  const portraitHeight = Math.min(height, maxWidth / aspect);
  return <Image source={{ uri: drawable }} objectFit="contain" style={{
    position: 'absolute', bottom: 0, right: 0, height: portraitHeight,
    width: portraitHeight * aspect,
  }} />;
}
