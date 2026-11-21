---
name: verify-widget-refresh
description: Verify widget publication and launcher parity when changing AnkiDroid refresh, appearance scheduling, widget sizing or rendering, or the publication guard.
---

# Verify widget refresh

When the app submits a widget snapshot, its artwork must reflect the review data, theme, and language current at that handoff. A slow render must never put old stats or the wrong character back on the launcher.

Run `bun run check` from the repository root. To isolate the verification, run `bun scripts/check-widget-model.mjs` and `bun scripts/check-widget-refresh.mjs`. The model runs with the pinned [`tla-ts`](https://github.com/aidenybai/tla-ts) dev dependency under Bun.

## Coverage and code mapping

- [WidgetRefresh.tla](../../../verification/widget-refresh/WidgetRefresh.tla) checks that a queued request submits the current inputs when it gets the publication permit. The submit step represents the handoff to Android.
- [The actor check](../../../scripts/check-widget-refresh.mjs) holds a native submission open and changes review data, layout, theme, language, and opacity. It checks the subsequent JSON sent to Android, including the switch from Streak First to Daily Progress. It also cold-starts the actor with the last successful review snapshot and holds the provider read open to verify the displayed counts stay available.
- Verify Android rendering separately. The preview builds its own snapshot from the current app preferences through the same renderer as the launcher.

## Investigate a failure

Translate the model checker's trace into the user's steps. Replay a failing input order in the actor check and compare the published JSON with what the widget should show. When the intended behavior changes, update the model and actor scenarios together. Verify both before shipping.

Run each mutation after editing the verification. The model should report `NoStalePublication` and the actor should report a stale widget snapshot. Both mutations run in scratch files.

```sh
bun scripts/check-widget-model.mjs --mutate-freshness
bun scripts/check-widget-refresh.mjs --mutate-freshness
```

Then run the normal local gate.

## Verify launcher parity

1. Pin one Compact and one Tall widget. At 0% transparency, capture each on the launcher and in the app with **Mood preview → Live**.
2. Compare the widget crops at the same scale. Confirm the stats, palette, and spacing match for each size. Check the full head and visible headroom for every character in both Waiting and Happy.
3. Resize a pinned widget and reopen the app. Compare the new bounds and layout. With different pinned dimensions in the same size class, use the dimension selector to check each.
4. Change layout and transparency, then return to the launcher. Compare the updated layout and opacity. The app surface and launcher wallpaper show through transparent pixels.
5. Cold-open the Widget screen and record through the first preview render. The Add widget button and appearance controls must keep their positions. Repeat while refreshing the preview data.
