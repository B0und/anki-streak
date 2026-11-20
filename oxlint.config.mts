import cloudflare from '@cloudflare/oxlint-config';
import { defineConfig } from 'oxlint';

const timers = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate'];
const timerMessage = 'Use Effect sleep, timeout or Schedule for owned work, or an XState delayed transition for actor state.';
const timerObjects = ['globalThis', 'global', 'window', 'self'];

export default defineConfig({
  ...cloudflare,
  rules: {
    ...cloudflare.rules,
    // Preserve the project's inline guards and mixed import and array type styles.
    curly: ['error', 'multi-line'],
    'import/consistent-type-specifier-style': 'off',
    'typescript/array-type': 'off',

    // Actor, Effect and Expo bridge APIs expose callbacks that can be detached.
    'typescript/unbound-method': 'off',
    'typescript/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true, minimumDescriptionLength: 12 },
    ],
    'xstate-effect/no-inline-effect': 'error',
    'no-restricted-imports': [
      'error',
      { name: 'react', importNames: ['useState', 'useEffect'], message: 'Use an XState actor for app state and lifecycle.' },
      { patterns: [{ group: ['node:timers', 'node:timers/*', 'timers', 'timers/*'], message: timerMessage }] },
    ],
    'no-restricted-properties': [
      'error',
      { object: 'React', property: 'useState', message: 'Use an XState actor for app state.' },
      { object: 'React', property: 'useEffect', message: 'Use an XState actor for app lifecycle.' },
      ...timerObjects.flatMap((object) => timers.map((property) => ({ object, property, message: timerMessage }))),
    ],
    'no-restricted-globals': [
      'error',
      ...timers.map((name) => ({ name, message: timerMessage })),
    ],
  },
  overrides: [
    ...cloudflare.overrides ?? [],
    {
      files: ['scripts/check-*.mjs'],
      globals: { Bun: 'readonly' },
      rules: { 'no-console': 'off' }, // Local check scripts report results on stdout.
    },
    {
      files: ['plugins/withLauncherThemes.js'],
      rules: {
        'typescript/no-require-imports': 'off', // Expo loads this CommonJS config plugin.
        'unicorn/consistent-function-scoping': 'off', // Keep the launcher filter beside its manifest update.
      },
    },
    {
      files: ['src/themes.ts'],
      rules: { 'typescript/no-require-imports': 'off' }, // Metro bundles the static PNG requires.
    },
    {
      files: ['src/themes.ts', 'src/TodayScreen.tsx', 'src/WidgetScreen.tsx', 'src/app/**/widget/themes.tsx'],
      rules: { 'typescript/no-unsafe-assignment': 'off' }, // Metro's require typing for portrait assets is any.
    },
    {
      files: ['src/activity.ts'],
      rules: {
        'quality/no-unknown-returns': 'off', // The native interface stays unknown until its Effect Schema decoders.
        'unicorn/prefer-top-level-await': 'off', // Activity reads and recovery are per-request Effect work.
      },
    },
    {
      files: ['src/appUpdateRelease.ts'],
      rules: {
        // Response.json() is typed as any. The response is decoded before it is used.
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-return': 'off',
      },
    },
    {
      files: ['src/useDashboard.ts'],
      rules: {
        'no-console': ['error', { allow: ['warn'] }], // Preserve diagnostics from the foreground refresh callback.
        'typescript/use-unknown-in-catch-callback-variable': 'off', // Existing rejection logging passes the value through.
      },
    },
    {
      files: ['src/AppUpdates.tsx'],
      rules: { 'unicorn/consistent-function-scoping': 'off' }, // Keep update view builders next to their call sites.
    },
    {
      files: ['src/widgetRefresh.ts'],
      rules: { 'import/no-namespace': 'off' }, // Expo exposes these native operations as module namespaces.
    },
    {
      files: ['src/rewardSettingsMachine.ts'],
      rules: { 'unicorn/prefer-string-replace-all': 'off' }, // The existing global regex already replaces every match.
    },
    {
      files: ['tamagui.config.ts'],
      rules: { 'typescript/no-empty-object-type': 'off' }, // Tamagui expands its configuration via interface augmentation.
    },
  ],
  ignorePatterns: [
    ...cloudflare.ignorePatterns ?? [],
    '.agents/skills/impeccable/**',
    '.agent_sources/**',
    'scripts/.widget-check-*/**',
    'android/**',
    'ios/**',
  ],
  jsPlugins: [
    ...cloudflare.jsPlugins ?? [],
    { name: 'xstate-effect', specifier: '@xstate/effect/oxlint' },
  ],
});
