const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const launcherEntry = 'expo.modules.ankiactivity.LauncherEntryActivity';

const themes = [
  { id: 'miku', icon: '@mipmap/ic_launcher' },
  { id: '2b', icon: '@drawable/launcher_2b' },
  { id: 'emilia', icon: '@drawable/launcher_emilia' },
];

module.exports = (config) => withAndroidManifest(config, (config) => {
  const manifest = config.modResults;
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  const isLauncher = (filter) => filter.category?.some(
    (category) => category.$['android:name'] === 'android.intent.category.LAUNCHER',
  );
  const launcher = main['intent-filter']?.find(isLauncher) ??
    app['activity-alias']?.find((alias) => alias.$['android:name'] === '.Launcher_miku')?.['intent-filter']?.[0];
  if (!launcher) throw new Error('Anki Streak launcher intent filter is missing');

  main['intent-filter'] = main['intent-filter']?.filter((filter) => !isLauncher(filter));
  app.activity = [
    ...(app.activity ?? []).filter((activity) => activity.$['android:name'] !== launcherEntry),
    {
      $: {
        'android:name': launcherEntry,
        'android:exported': 'false',
        'android:excludeFromRecents': 'true',
        'android:noHistory': 'true',
        'android:taskAffinity': '',
        'android:theme': '@android:style/Theme.NoDisplay',
      },
    },
  ];
  const themedAliases = themes.map(({ id, icon }) => ({
    $: {
      'android:name': `.Launcher_${id}`,
      'android:targetActivity': launcherEntry,
      'android:exported': 'true',
      'android:enabled': String(id === 'miku'),
      'android:icon': icon,
    },
    'intent-filter': [launcher],
  }));
  app['activity-alias'] = [
    ...(app['activity-alias'] ?? []).filter((alias) => !themedAliases.some(
      (themed) => themed.$['android:name'] === alias.$['android:name'],
    )),
    ...themedAliases,
  ];
  return config;
});
