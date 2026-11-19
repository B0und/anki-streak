import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Palette } from './appearance';

export function Action({ children, onPress, palette, primary, disabled }: {
  children: ReactNode; onPress(): void; palette: Palette; primary?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.action, {
        backgroundColor: primary ? palette.accent : palette.subtle,
        opacity: disabled ? .55 : pressed ? .75 : 1,
      }]}>
      <Text style={{ color: primary ? palette.onAccent : palette.text, fontWeight: '600', textAlign: 'center' }}>{children}</Text>
    </Pressable>
  );
}

export function Choices<T extends string>({ choices, value, onChange, label, palette }: {
  choices: readonly T[]; value: T; onChange(value: T): void; label(value: T): string; palette: Palette;
}) {
  return (
    <View style={[styles.choices, { backgroundColor: palette.subtle }]}>
      {choices.map((choice) => (
        <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: value === choice }}
          onPress={() => onChange(choice)} style={[styles.choice, value === choice && { backgroundColor: palette.surface }]}>
          <Text style={{ color: value === choice ? palette.accent : palette.muted, fontWeight: '700', textAlign: 'center' }}>
            {label(choice)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Section({ title, palette, children }: { title: string; palette: Palette; children: ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontWeight: '700', fontSize: 17 }}>{title}</Text>
      {children}
    </View>
  );
}

export function CountUp({ value, delay, celebration }: {
  value: number | undefined; delay: number; celebration: number;
}) {
  const [animated, setAnimated] = useState<{ token: number; value: number } | null>(null);
  useEffect(() => {
    if (!celebration || value === undefined) return;
    let active = true;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      setAnimated({ token: celebration, value: 0 });
      timer = setTimeout(() => {
        const start = Date.now();
        const tick = () => {
          const progress = Math.min(1, (Date.now() - start) / 620);
          setAnimated({ token: celebration, value: Math.round(value * (1 - (1 - progress) ** 3)) });
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, delay);
    }).catch(() => {});
    return () => {
      active = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delay, celebration]);
  return animated?.token === celebration && animated?.value !== undefined
    ? animated.value : value ?? '—';
}

export function Portrait({ source, height, maxWidth }: {
  source: number; height: number; maxWidth: number;
}) {
  const { width, height: imageHeight } = Image.resolveAssetSource(source) ?? { width: 1, height: 1 };
  return <Image source={source} resizeMode="contain"
    style={{ position: 'absolute', bottom: 0, right: 0, height, width: Math.min(maxWidth, height * (width ?? 1) / (imageHeight ?? 1)) }} />;
}

const styles = StyleSheet.create({
  action: { minHeight: 46, paddingHorizontal: 13, paddingVertical: 9, justifyContent: 'center', borderRadius: 12 },
  choices: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13 },
  choice: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderRadius: 10 },
  section: { padding: 15, gap: 10, borderWidth: 1, borderRadius: 18 },
});
