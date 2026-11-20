---
name: verify-widget-refresh
description: Verify widget publication and launcher parity when changing AnkiDroid refresh, appearance scheduling, widget sizing or rendering, or the publication guard.
---

# Verify widget refresh

When the app submits a widget snapshot, its artwork must reflect the review data, theme, and language current at that handoff. A slow render must never put old stats or the wrong character back on the launcher.

Run `bun run check` from the repository root. To isolate the verification, run `bun scripts/check-widget-model.mjs` and `bun scripts/check-widget-refresh.mjs`. The model runs with the pinned [`tla-ts`](https://github.com/aidenybai/tla-ts) dev dependency under Bun.

## Coverage and code mapping

- [WidgetRefresh.tla](../../../verification/widget-refresh/WidgetRefresh.tla) models `publishLatest` and the data and appearance regions in [widgetRefresh.ts](../../../src/widgetRefresh.ts). `StartRender` captures current inputs under the publication permit. Input changes represent actor and preference writes while the native render is awaiting completion. `RestartStaleRender` captures fresh inputs after the guard detects a change. `SubmitSnapshot` represents the handoff to `publishSnapshot` in the same synchronous turn as the freshness check.
- `tla-ts` checks every reachable order with two review values, two themes, two languages, one transition per input, and one in-flight render. `NoStalePublication` compares the submitted artwork with the inputs current at that handoff.
- [The actor check](../../../scripts/check-widget-refresh.mjs) drives the real XState actor and Effect pipeline with controlled Expo and AnkiDroid boundaries. It checks all 24 orders of one theme change, one language change, one transparency change, and first render completion. It also checks a refresh that reads new review data while an appearance render is in flight. The assertion reads the actual JSON passed to the native publisher.
- Coverage ends at the native handoff. Android rendering, launcher display, retries, and unbounded event sequences are outside the model.

Sync commit for `src/widgetRefresh.ts`: `ae5277973ca051f20593ea922ceb2ae29be542a1`.

## Investigate a failure

Translate the model checker's trace into the user's steps. Replay a failing input order in the actor check and compare the published JSON with what the widget should show. When the intended behavior changes, update the model and actor scenarios together. Advance the sync commit after verifying both.

Run each mutation after editing the verification. The model should report `NoStalePublication` and the actor should report stale artwork. Both mutations run in scratch files.

```sh
bun scripts/check-widget-model.mjs --mutate-freshness
bun scripts/check-widget-refresh.mjs --mutate-freshness
```

Then run the normal local gate.

## Verify launcher parity

1. Pin one Compact and one Tall widget. At 0% transparency, capture each on the launcher and in the app with **Mood preview → Live**.
2. Compare the widget crops at the same scale. Confirm the stats, portrait crop, palette, and spacing match for each size. Repeat for each character when changing portrait or layout code.
3. Resize a pinned widget and reopen the app. Compare the new bounds and layout. With different pinned dimensions in the same size class, use the dimension selector to check each.
4. Change layout and transparency, then return to the launcher. Compare the updated layout and opacity. The app surface and launcher wallpaper show through transparent pixels.
