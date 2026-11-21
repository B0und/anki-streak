import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitFor } from 'xstate';

const source = fileURLToPath(new URL('../src/widgetRefresh.ts', import.meta.url));
const mutate = process.argv.includes('--mutate-freshness');
const hostKey = '__ankiWidgetVerificationHost';

async function bundleWidget() {
  const result = await Bun.build({
    entrypoints: [source],
    target: 'bun',
    external: ['effect', 'xstate'],
    plugins: [{
      name: 'widget-verification-host',
      setup(build) {
        build.onResolve({ filter: /^(expo|expo-background-task|expo-task-manager|\.\/AnkiWidget)$|\.png$/ },
          ({ path }) => ({ path, namespace: 'verification' }));
        build.onLoad({ filter: /.*/, namespace: 'verification' }, ({ path }) => {
          const native = `globalThis.${hostKey}`;
          const adapters = {
            expo: `export const requireNativeModule = (name) => ${native}[name];`,
            'expo-background-task': 'export async function registerTaskAsync() {}',
            'expo-task-manager': 'export function defineTask() {}\nexport async function isTaskRegisteredAsync() { return true }',
          };
          return { loader: 'js', contents: adapters[path] ?? 'export default undefined;' };
        });

        if (mutate) {
          build.onLoad({ filter: /\/widgetRefresh\.ts$/ }, async ({ path }) => {
            const original = await Bun.file(path).text();
            const entry = 'Effect.suspend(() => publishing.withPermit(';
            const capture = 'const { activity } = widgetRefreshActor.getSnapshot().context;';
            assert.equal(original.split(entry).length, 2);
            assert.equal(original.split(capture).length, 2);
            return { contents: original.replace(capture, 'const { activity } = queued;')
              .replace('themeId: getWidgetTheme(),', 'themeId: queuedTheme,')
              .replace(entry, 'Effect.suspend(() => { const queued = widgetRefreshActor.getSnapshot().context; const queuedTheme = getWidgetTheme(); return publishing.withPermit(')
              .replace(')).pipe(\n  Effect.retry', '); }).pipe(\n  Effect.retry'), loader: 'ts' };
          });
        }
      },
    }],
  });
  assert.equal(result.outputs.length, 1);
  return result.outputs[0].text();
}

function makeHost() {
  let blocker;
  const holdNext = () => {
    const start = Promise.withResolvers();
    const finish = Promise.withResolvers();
    blocker = { start, finish };
    return { start: start.promise, finish: finish.resolve };
  };
  const first = holdNext();
  const state = { reviews: 2, theme: 'miku', language: 'en', transparency: 0, layout: 'first' };
  const publications = [];
  const preferences = new Map();
  return {
    state, preferences, publications, first, holdNext,
    AnkiActivity: {
      historyRows: 7,
      historyColumns: 1,
      getWidgetTheme: () => state.theme,
      getWidgetBackgroundTransparency: () => state.transparency,
      setWidgetBackgroundTransparency(value) { state.transparency = value; },
      async readActivity() {
        return {
          kind: 'ready', today: state.reviews, newToday: 1, dueReviews: 0, streak: 20,
          history: { counts: [0, 1, 0, 1, 2, 0, state.reviews], todayRow: 2 }, dailyReviewed: state.reviews, dailyLearned: 1,
        };
      },
    },
    StudyPreferences: {
      getPreference: (key) => key === 'language' ? state.language : key === 'animate' ? 'off'
        : key.startsWith('layout-') ? state.layout : preferences.get(key) ?? null,
      setPreference: (key, value) => preferences.set(key, value),
    },
    ExpoWidgets: {
      async publishSnapshot(name, json) {
        assert.equal(name, 'AnkiStreak');
        publications.push({ props: JSON.parse(json), state: { ...state } });
        const active = blocker;
        blocker = undefined;
        if (active) {
          active.start.resolve();
          await active.finish.promise;
        }
      },
    },
  };
}

const directory = mkdtempSync(fileURLToPath(new URL('.widget-check-', import.meta.url)));
const bundle = join(directory, 'widget.mjs');
const waitOptions = { timeout: 3000 };

try {
  await Bun.write(bundle, await bundleWidget());
  const host = makeHost();
  globalThis[hostKey] = host;
  const app = await import(bundle);
  try {
    const initial = app.refreshWidget();
    await host.first.start;
    Object.assign(host.state, { theme: 'emilia', language: 'ru', layout: 'current' });
    app.republishWidgetAppearance();
    await waitFor(app.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'publishing' }), waitOptions);
    // An appearance request waits behind an already submitted snapshot.
    host.state.reviews = 3;
    host.first.finish();
    await initial;
    await app.refreshWidget();
    app.changeWidgetBackgroundTransparency(50);
    app.republishWidgetAppearance();
    await waitFor(app.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'quiet' }), waitOptions);
    const { props } = host.publications.at(-1);
    assert.equal(props.waitingDrawable, 'emilia_waiting');
    assert.equal(props.cards.tall.value, '3');
    assert.equal(props.cards.tall.days[2].label, 'Ср');
    assert.equal(props.cards.compact.averages, '3 повторов · 1 новых в день');
    assert.equal(props.backdrop, '#00000080');
  } finally {
    host.first.finish();
    app.widgetRefreshActor.stop();
  }

  const nextHost = makeHost();
  globalThis[hostKey] = nextHost;
  const next = await import(`${bundle}?concurrent`);
  try {
    // Hold an appearance submission so a second appearance request waits while a fresh read completes.
    const initial = next.refreshWidget();
    await nextHost.first.start;
    nextHost.first.finish();
    await initial;
    const blocked = nextHost.holdNext();
    next.republishWidgetAppearance();
    await blocked.start;
    nextHost.state.reviews = 3;
    nextHost.state.layout = 'current';
    const fresh = next.refreshWidget();
    await waitFor(next.widgetRefreshActor, (snapshot) => snapshot.matches({ data: 'publishing' }), waitOptions);
    nextHost.state.reviews = 4;
    nextHost.state.theme = 'emilia';
    // The queued data publication observes the activity already read, not the next provider value.
    next.republishWidgetAppearance();
    blocked.finish();
    await fresh;
    await waitFor(next.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'quiet' }), waitOptions);
    assert.ok(nextHost.publications.slice(2).every(({ props }) => props.cards.tall.value === '3' && props.waitingDrawable === 'emilia_waiting'), 'Stale widget snapshot behind the publication permit');
  } finally {
    next.widgetRefreshActor.stop();
  }
  const restarting = makeHost();
  restarting.first.finish();
  restarting.preferences.set('last-review-activity', nextHost.preferences.get('last-review-activity'));
  const read = Promise.withResolvers();
  const readActivity = restarting.AnkiActivity.readActivity;
  restarting.AnkiActivity.readActivity = async () => {
    await read.promise;
    return readActivity();
  };
  globalThis[hostKey] = restarting;
  const resumed = await import(`${bundle}?restart`);
  try {
    const fresh = resumed.refreshWidget();
    await waitFor(resumed.widgetRefreshActor, (snapshot) => snapshot.matches({ data: 'reading' }), waitOptions);
    const { activity, check } = resumed.widgetRefreshActor.getSnapshot().context;
    assert.equal(activity?.today, 3, 'Keep the last successful counts visible while reopening');
    assert.equal(check, null, 'The cached snapshot is not a new review check');
    read.resolve();
    await fresh;
    assert.equal(resumed.widgetRefreshActor.getSnapshot().context.activity?.today, 2);
  } finally {
    read.resolve();
    resumed.widgetRefreshActor.stop();
  }
  const questsHost = makeHost();
  questsHost.state.layout = 'dailyQuests';
  questsHost.first.finish();
  globalThis[hostKey] = questsHost;
  const quests = await import(`${bundle}?quests`);
  try {
    await quests.refreshWidget();
    const initial = questsHost.publications.at(-1).props.cards;
    assert.equal(initial.compact.value, '2/4');
    assert.deepEqual(initial.tall.quests.goals.map((goal) => goal.value), ['2/20', '1/5']);

    const blocked = questsHost.holdNext();
    quests.republishWidgetAppearance();
    await blocked.start;
    questsHost.preferences.set('reviewTarget', '2');
    questsHost.preferences.set('newTarget', '1');
    quests.republishWidgetAppearance();
    blocked.finish();
    await waitFor(quests.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'quiet' }), waitOptions);
    const updated = questsHost.publications.at(-1).props.cards;
    assert.equal(updated.tall.value, '4/4');
    assert.deepEqual(updated.tall.quests.goals.map((goal) => goal.fraction), [1, 1]);
  } finally {
    quests.widgetRefreshActor.stop();
  }
  console.log('Widget refresh passed layout, portrait, language, opacity, queued publication, cold-start activity, and daily quest checks.');
} finally {
  delete globalThis[hostKey];
  if (await Bun.file(bundle).exists()) unlinkSync(bundle);
  rmdirSync(directory);
}
