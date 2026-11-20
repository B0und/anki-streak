import { useActor } from '@xstate/react';
import type { ReactNode } from 'react';
import { Image as NativeImage } from 'react-native';
import { Button, Image, Text, View, XStack, YStack } from 'tamagui';

import { countUpMachine } from './countUpMachine';

export function Action({ children, onPress, primary, disabled }: {
  children: ReactNode; onPress(): void; primary?: boolean; disabled?: boolean;
}) {
  return (
    <Button size={false} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
      minH={46} px={13} py={9} justify="center" rounded={12}
      bg={primary ? 'accent' : 'subtle'} opacity={disabled ? .55 : 'press:0.75'}>
      <Text color={primary ? 'on-accent' : 'color'} fontWeight="600" text="center">{children}</Text>
    </Button>
  );
}

export function Choices<T extends string>({ choices, value, onChange, label }: {
  choices: readonly T[]; value: T; onChange(value: T): void; label(value: T): string;
}) {
  return (
    <XStack bg="subtle" p={4} gap={4} rounded={13}>
      {choices.map((choice) => {
        const checked = value === choice;
        return <View key={choice} accessibilityRole="radio" accessibilityState={{ checked }}
          onPress={() => onChange(choice)} flex={1} minH={42} justify="center" items="center"
          px={3} rounded={10} bg={checked ? 'surface' : 'transparent'} opacity="press:0.75">
          <Text color={checked ? 'accent' : 'muted'} fontWeight="700" text="center">{label(choice)}</Text>
        </View>;
      })}
    </XStack>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack bg="surface" borderColor="border-color" borderWidth={1} rounded={18} p={15} gap={10}>
      <Text accessibilityRole="header" color="color" fontWeight="700" fontSize={17}>{title}</Text>
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

export function Portrait({ source, height, maxWidth }: {
  source: number; height: number; maxWidth: number;
}) {
  const { width, height: imageHeight } = NativeImage.resolveAssetSource(source) ?? { width: 1, height: 1 };
  return <Image source={source} resizeMode="contain"
    position="absolute" b={0} r={0} h={height} w={Math.min(maxWidth, height * (width ?? 1) / (imageHeight ?? 1))} />;
}
