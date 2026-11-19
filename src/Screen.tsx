import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';

export function Screen({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) {
  const { palette, language } = useDashboardContext();
  return <>
    <View style={styles.header}>
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel={copy(language, 'back')}
        onPress={onBack} style={styles.back}>
        <ArrowLeft size={22} color={palette.accent} />
      </Pressable>}
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>{title}</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontFamily: 'serif', fontWeight: 'bold', fontSize: 30 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  content: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
});
