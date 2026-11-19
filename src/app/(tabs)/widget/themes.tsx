import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDashboardContext } from '../../../dashboardContext';
import { copy } from '../../../messages';
import { Screen } from '../../../Screen';
import { themeOrder, themes } from '../../../themes';

const sources = { miku: 'Vocaloid', '2b': 'NieR:Automata', emilia: 'Re:Zero' };

export default function ThemesRoute() {
  const { dashboard, palette, language } = useDashboardContext();
  const router = useRouter();
  return <Screen title={copy(language, 'themes')} onBack={() => router.canGoBack() ? router.back() : router.replace('/widget')}>
    {themeOrder.map((id) => {
      const theme = themes[id];
      const selected = id === dashboard.themeId;
      return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: selected }}
        onPress={() => void dashboard.selectTheme(id)}
        style={[styles.themeCard, { backgroundColor: palette.surface, borderColor: selected ? palette.accent : palette.line }]}>
        <View style={[styles.themeArt, { backgroundColor: theme.card }]}>
          <Image resizeMode="contain" source={theme[selected ? dashboard.mood : 'happy']}
            style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={{ color: palette.text, fontFamily: 'serif', fontWeight: 'bold', fontSize: 23 }}>{theme.name}</Text>
          <Text style={{ color: palette.muted, marginTop: 3 }}>{sources[id]}</Text>
          {selected && <Text style={{ color: palette.accent, marginTop: 7, fontWeight: '700' }}>{copy(language, 'choose')}</Text>}
        </View>
      </Pressable>;
    })}
  </Screen>;
}
const styles = StyleSheet.create({
  themeCard: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', minHeight: 127 },
  themeArt: { width: '43%', height: 126, overflow: 'hidden' },
});
