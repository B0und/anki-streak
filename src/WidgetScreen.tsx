import { Host, Slider } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { renderWidget, type AnkiActivity } from './activity';
import type { WidgetArtwork } from './AnkiWidget';
import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { widgetLayouts, type WidgetLayout } from './preferences';
import { Action, Choices, Portrait, Section } from './studyComponents';
import { themes } from './themes';
import type { useDashboard } from './useDashboard';

const previewSizes = ['compact', 'tall'] as const;
const sample = { today: 18, streak: 24, dailyReviewed: 42, dailyLearned: 10,
  history: Array.from({ length: 102 }, (_, index) => index === 101 ? 18 : ((index * 73 + index % 7 * 19) % 151) % 62) };

export function WidgetScreen({ dashboard, palette, language, layout, setLayout, openThemes }: {
  dashboard: ReturnType<typeof useDashboard>;
  palette: Palette; language: Language; layout: WidgetLayout;
  setLayout(layout: WidgetLayout): void; openThemes(): void;
}) {
  const [size, setSize] = useState<(typeof previewSizes)[number]>('compact');
  const [width, setWidth] = useState(320);
  const [example, setExample] = useState<WidgetArtwork | null>(null);
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;
  const result = dashboard.widgetArtwork;
  const artwork = result?.theme === dashboard.themeId ? result.artwork : example;
  const theme = themes[dashboard.themeId];
  const height = size === 'tall' ? width * .56 : width * .245;
  const data: Pick<Extract<AnkiActivity, {kind:'ready'}>, 'today' | 'streak'> = ready ?? sample;
  const previewPortrait = theme[ready?.mood ?? 'happy'];

  useEffect(() => {
    if (ready || layout !== 'current') return;
    let active = true;
    void renderWidget(sample.streak, sample.today, sample.history, sample.dailyReviewed, sample.dailyLearned, dashboard.themeId, 'preview')
      .then((art) => { if (active) setExample(art); }).catch(() => {});
    return () => { active = false; };
  }, [ready, dashboard.themeId, layout]);

  const portraitAspect = artwork?.portraitAspect ?? 1.04;
  const portraitWidth = Math.min((height - 4) * portraitAspect, width * (size === 'tall' ? .58 : .38));
  const statsWidth = width - portraitWidth - 6 + (size === 'tall' && layout === 'current' ? Math.min(12, portraitWidth * .08) : 0);
  const bitmap = size === 'tall' ? artwork?.tallStats : artwork?.compactStats;
  const layoutName = (key: WidgetLayout) => copy(language, key);

  return <>
    <Section title={copy(language, 'preview')} palette={palette}>
      {!ready && <Text style={{ color: palette.muted }}>{copy(language, 'sampleData')}</Text>}
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ borderRadius: 19, overflow: 'hidden', backgroundColor: palette.subtle }}>
        <View style={{ height, justifyContent: 'center' }}>
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0,
            opacity: 1 - dashboard.transparency / 100, backgroundColor: layout === 'current' ? '#000000' : theme.card }} />
          <Portrait source={previewPortrait} height={portraitWidth / portraitAspect} maxWidth={portraitWidth} />
          {layout === 'current' ? (bitmap && <Image key={bitmap.uri} source={{ uri: bitmap.uri }} resizeMode="contain"
            style={{ width: statsWidth, height: Math.min(height, statsWidth / bitmap.aspect) }} />) : (
            <View style={{ paddingLeft: 14, width: statsWidth, gap: 1 }}>
              <View style={{ flexDirection: size === 'tall' ? 'column' : 'row', alignItems: size === 'tall' ? 'flex-start' : 'center', gap: 5 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size === 'tall' ? 48 : 30 }} adjustsFontSizeToFit numberOfLines={1}>
                  {layout === 'focus' ? data.today : data.streak}
                </Text>
                <Text style={{ color: '#FFFFFF', flexShrink: 1, fontSize: size === 'tall' ? 14 : 12 }}>
                  {copy(language, layout === 'focus' ? 'reviewed' : 'streak')}
                </Text>
              </View>
              <Text style={{ color: theme.accent, fontSize: size === 'tall' ? 14 : 12, fontWeight: '600' }} numberOfLines={1}>
                {copy(language, layout === 'focus' ? 'streak' : 'reviewed')}: {layout === 'focus' ? data.streak : data.today}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Choices<(typeof previewSizes)[number]> palette={palette} choices={previewSizes} value={size} onChange={setSize} label={(key) => copy(language, key)} />
    </Section>
    <Section title={copy(language, 'layout')} palette={palette}>
      {widgetLayouts.map((key) => (
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: layout === key }}
          onPress={() => setLayout(key)} key={key}
          style={{ padding: 11, borderRadius: 11, borderWidth: 1, borderColor: layout === key ? palette.accent : palette.line,
            backgroundColor: layout === key ? palette.subtle : palette.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: palette.accent, fontSize: 17 }}>{layout === key ? '◉' : '○'}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: palette.text, fontWeight: '700' }}>{layoutName(key)}</Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>{copy(language, `${key}Detail`)}</Text>
          </View>
        </Pressable>
      ))}
    </Section>
    <Section title={copy(language, 'appearance')} palette={palette}>
      <Action palette={palette} onPress={openThemes}>{copy(language, 'theme')} · {theme.name}</Action>
      <Text style={{ color: palette.text }}>{copy(language, 'transparency')} · {dashboard.transparency}%</Text>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <Slider min={0} max={100} value={dashboard.transparency}
          colors={{ activeTrackColor: palette.accent, thumbColor: palette.accent, inactiveTrackColor: palette.line }}
          modifiers={[fillMaxWidth(), semantics({ contentDescription: copy(language, 'transparency') })]}
          onValueChange={(value) => dashboard.changeTransparency(Math.round(value))} />
      </Host>
    </Section>
    <Action palette={palette} primary disabled={dashboard.requesting}
      onPress={() => void dashboard.runAndroidRequest('pin')}>{copy(language, 'addWidget')}</Action>
  </>;
}
