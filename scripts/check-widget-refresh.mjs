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
            const guard = 'if (latest.activity !== activity || getWidgetTheme() !== theme || getLanguage() !== language) continue;';
            assert.equal(original.split(guard).length, 2, 'Update the freshness mutation to match the code');
            return { contents: original.replace(guard, ''), loader: 'ts' };
          });
        }
      },
    }],
  });
  assert.equal(result.outputs.length, 1);
  return result.outputs[0].text();
}

function* orders(events) {
  if (events.length === 0) {
    yield [];
    return;
  }

  for (const event of events) {
    for (const rest of orders(events.filter((candidate) => candidate !== event))) {
      yield [event, ...rest];
    }
  }
}

function makeHost() {
  let reviews = 2;
  let theme = 'miku';
  let language = 'en';
  let transparency = 0;
  let hold;
  const publications = [];
  const artworkKey = () => `${reviews}/${theme}/${language}`;
  const backdrop = () => transparency === 0 ? '#000000ff' : '#00000080';

  return {
    publications, artworkKey, backdrop,
    setTheme(value) { theme = value; },
    setLanguage(value) { language = value; },
    setReviews(value) { reviews = value; },
    holdNextRender() {
      const started = Promise.withResolvers();
      const completed = Promise.withResolvers();
      hold = { started, completed };
      return { started: started.promise, complete: () => completed.resolve() };
    },
    AnkiActivity: {
      historyRows: 7,
      historyColumns: 1,
      getWidgetTheme: () => theme,
      getWidgetBackgroundTransparency: () => transparency,
      setWidgetBackgroundTransparency(value) { transparency = value; },
      async readActivity() {
        return {
          kind: 'ready', today: reviews, newToday: 0, dueReviews: 0, streak: 1,
          history: { counts: [0, 1, 0, 1, 2, 0, reviews], todayRow: 2 }, dailyReviewed: reviews, dailyLearned: 0,
        };
      },
      async renderWidget(_streak, today, _history, _reviewed, _learned, renderedTheme, _purpose, renderedLanguage) {
        const pending = hold;
        hold = undefined;
        if (pending) {
          pending.started.resolve();
          await pending.completed.promise;
        }

        const image = { uri: `${today}/${renderedTheme}/${renderedLanguage}`, aspect: 1 };
        return { compactStats: image, portraitDrawable: renderedTheme, portraitAspect: 1 };
      },
    },
    StudyPreferences: {
      getPreference: (key) => key === 'language' ? language : key === 'animate' ? 'off' : null,
    },
    ExpoWidgets: {
      async publishSnapshot(name, json) {
        publications.push({ name, props: JSON.parse(json), artwork: artworkKey(), backdrop: backdrop() });
      },
    },
  };
}

function assertPublications(host, trace) {
  assert.ok(host.publications.length > 0, `No widget publication for ${trace}`);
  for (const { name, props, artwork, backdrop } of host.publications) {
    assert.equal(name, 'AnkiStreak', trace);
    assert.equal(props.artwork?.compactStats.uri, artwork, `Stale widget artwork for ${trace}`);
    const [reviews, , language] = artwork.split('/');
    assert.equal(props.tallCurrent?.value, reviews, `Stale tall widget count for ${trace}`);
    assert.deepEqual(props.tallCurrent?.days.map(({ state }) => state),
      ['reviewed', 'missed', 'today-reviewed', 'future', 'future', 'future', 'future'], trace);
    assert.equal(props.tallCurrent?.days[2].label, language === 'ru' ? 'Ср' : 'Wed', `Stale weekday locale for ${trace}`);
    assert.equal(props.backdrop, backdrop, `Stale widget transparency for ${trace}`);
  }

  const last = host.publications.at(-1).props;
  assert.equal(last.artwork?.compactStats.uri, host.artworkKey(), `Latest preferences were never published for ${trace}`);
  assert.equal(last.backdrop, host.backdrop(), `Latest transparency was never published for ${trace}`);
}

const directory = mkdtempSync(fileURLToPath(new URL('.widget-check-', import.meta.url)));
const bundle = join(directory, 'widget.mjs');
const waitOptions = { timeout: 3000 };

try {
  await Bun.write(bundle, await bundleWidget());
  let checked = 0;
  for (const order of orders(['theme', 'language', 'transparency', 'render completion'])) {
    const host = makeHost();
    globalThis[hostKey] = host;
    const app = await import(`${bundle}?scenario=${checked}`);
    const render = host.holdNextRender();
    const refresh = app.refreshWidget();
    const pendingRefreshes = [refresh];
    const previewFrames = [];
    let previous;
    app.widgetRefreshActor.subscribe(({ context }) => {
      if (!context.artwork || context.artwork === previous) return;
      previous = context.artwork;
      previewFrames.push({ uri: previous.artwork.compactStats.uri, expected: host.artworkKey() });
    });

    try {
      await Promise.race([
        render.started,
        waitFor(app.widgetRefreshActor, () => false, waitOptions),
      ]);

      let renderCompleted = false;
      for (const event of order) {
        switch (event) {
          case 'theme':
          case 'language': {
            if (event === 'theme') host.setTheme('emilia');
            else host.setLanguage('ru');
            const preferenceRefresh = app.refreshWidget();
            if (renderCompleted) await preferenceRefresh;
            else pendingRefreshes.push(preferenceRefresh);
            break;
          }
          case 'transparency':
            app.changeWidgetBackgroundTransparency(50);
            break;
          case 'render completion':
            render.complete();
            await refresh;
            renderCompleted = true;
            break;
        }
      }

      await Promise.all(pendingRefreshes);
      await waitFor(app.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'quiet' }), waitOptions);
      assertPublications(host, order.join(' → '));
      for (const { uri, expected } of previewFrames) {
        assert.equal(uri, expected, `Superseded preview artwork for ${order.join(' → ')}`);
      }
      checked += 1;
    } finally {
      render.complete();
      app.widgetRefreshActor.stop();
    }
  }

  const host = makeHost();
  globalThis[hostKey] = host;
  const app = await import(`${bundle}?scenario=new-activity`);
  const render = host.holdNextRender();
  try {
    render.complete();
    await app.refreshWidget();
    const lastFrame = app.widgetRefreshActor.getSnapshot().context.artwork;
    assert.ok(lastFrame, 'Initial preview artwork is ready');

    const appearanceRender = host.holdNextRender();
    try {
      host.setTheme('emilia');
      app.republishWidgetAppearance();
      await Promise.race([
        appearanceRender.started,
        waitFor(app.widgetRefreshActor, () => false, waitOptions),
      ]);

      host.setReviews(3);
      const refresh = app.refreshWidget();
      await waitFor(app.widgetRefreshActor, (snapshot) => snapshot.matches({ data: 'publishing' }), waitOptions);
      assert.equal(app.widgetRefreshActor.getSnapshot().context.artwork, lastFrame, 'Retain the completed frame while the next one is rendering');
      appearanceRender.complete();
      await refresh;
      await waitFor(app.widgetRefreshActor, (snapshot) => snapshot.matches({ appearance: 'quiet' }), waitOptions);
      assertPublications(host, 'New reviews arrive during an appearance render');
    } finally {
      appearanceRender.complete();
    }
  } finally {
    app.widgetRefreshActor.stop();
  }

  console.log(`Widget refresh passed ${checked} preference/render orders and the in-flight review update.`);
} finally {
  delete globalThis[hostKey];
  if (await Bun.file(bundle).exists()) unlinkSync(bundle);
  rmdirSync(directory);
}
