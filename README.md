# Anki Streak

An Android home-screen widget and React Native companion app. Miku looks sad until you answer a card in AnkiDroid, then smiles. The widget shows your streak, a 102-day heatmap, and daily averages for reviews and new cards learned.

## Add the widget

1. Install Anki Streak on the same phone as AnkiDroid 2.24 or later.
2. Open **Anki Streak**, tap **Connect AnkiDroid**, and allow access. AnkiDroid names its API permission “read and write.” Anki Streak only queries review counts.
3. Tap **Add home screen widget** and confirm the launcher prompt. If your launcher has no prompt, touch and hold the home screen and find **Anki Streak** in its widget picker.

Answering the same card multiple times counts as one card for that study day. Brighter heatmap cells mark busier days. Both averages cover the last 30 completed Anki study days, including days with zero. A new card counts on the day you first answer it. The streak includes yesterday if your current Anki study day is still open and you haven't answered a card. The app refreshes the widget when you open it. Android schedules background refreshes with a 15-minute minimum interval. To see an update immediately, open **Anki Streak** and tap **Refresh**.

Tap the widget to open Anki Streak. Choose **Miku**, **2B**, or **Emilia** in the app to change the artwork, palette, and launcher icon. Use **Background transparency** to fade the black panel behind the artwork and stats. Long-press the widget and drag the horizontal or vertical handles to resize it. The theme and background setting apply to every Anki Streak widget on your phone.

## Today, themes, and widget layouts

**Today** shows your streak, today's reviews and first-time answers, both daily averages, and the full heatmap. In **Widget**, tap **Theme** to change the character across the app and home-screen widget. The live preview shows the selected Compact or Tall layout and responds to changes in background transparency and mood. Under **Widget layouts**, choose **Current**, **Daily Focus**, or **Streak First** for each size. The Current layout includes review history. The other layouts highlight today's reviews or the streak.

In **Settings**, see how AnkiDroid sync works and check when Anki Streak last read your data. Follow Android's appearance and language or choose a light or dark appearance and English or Russian. You can also choose a celebration for the first review, clearing due reviews, a daily review target, a daily new-card target, or every set number of streak days. Set the target and turn notifications and the count-up animation on or off independently. The app celebrates once per day, using a 4 a.m. local reset for the reward. Android schedules background checks, so notifications can arrive after you finish studying.

## Update the app

Install an updater-enabled APK once to enable update checks. Anki Streak checks GitHub Releases when you open the app and every five minutes while it is active. A banner takes you to the update in Settings. **Check for updates** in Settings runs a check immediately.

When an update appears, tap **Download and install**. If Android opens its install permission settings, allow installs from Anki Streak, return to the app, and tap **Install update**. Confirm the update in the Android installer. In-place updates keep app settings and pinned widgets.

The in-app updater is available on Android 8.0 or later with the project's release-signed APK. Development builds use a separate signing key and are updated with a matching development APK.

## Build an APK

Use Bun, Node.js, JDK 21, and the Android SDK. Install Android SDK Platform 37.0, Build-Tools 37.0.0, NDK 27.1.12297006, and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`.

```sh
bun install --frozen-lockfile
bunx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK is at `android/app/build/outputs/apk/release/app-release.apk` relative to the project root. It is signed with the local development key for sideloading. The APK includes the JavaScript bundle and runs without Metro.

Run `bun run lint` for Oxlint and `bun run typecheck` for TypeScript.

For a GitHub release, set `expo.version` in `app.json` to the release version and increase `expo.android.versionCode`. Sign the APK with the existing release key. Publish a stable release tagged `vMAJOR.MINOR.PATCH` and upload the APK as `Anki-Streak.apk`. Place it at `dist/<tag>/Anki-Streak.apk` and run `scripts/publish-release.sh <tag> <release-notes.md>` from the project root. This pushes the signed APK to a staging branch and GitHub Actions publishes the release using its repository token. After you verify the public release, delete the staging branch with `git push origin --delete release-assets/<tag>`. The updater reads the version from the tag and the SHA-256 digest from GitHub's asset metadata.

## State transitions

The [glossary](GLOSSARY.md) defines the terms used below. TypeScript state lives in tagged unions. Android remains the source of truth for permissions, launcher components, widget dimensions, and background scheduling.

| Flow | Transitions and owner |
| --- | --- |
| Widget refresh | [`widgetRefresh.ts`](src/widgetRefresh.ts) moves from `initial`, `settled`, or `failed` through `reading` and `rendering` to `settled` or `failed`. Dashboard and background callers in the same runtime join an active refresh. If the theme changes during rendering, the refresh renders the current selection before publishing. A thrown refresh failure retains the last completed result for the dashboard. |
| AnkiDroid readiness | [`activity.ts`](src/activity.ts) classifies each provider read as `ready`, `permission`, `missing`, `unsupported`, or `unavailable`. A ready read produces review content. Other outcomes produce setup guidance. Returning to the app or tapping Refresh reads the provider again. |
| Android requests | [`useDashboard.ts`](src/useDashboard.ts) accepts one request at a time for permission, settings, widget pinning, or opening AnkiDroid. A request runs from `idle` or `notice` through `running`, then returns to `idle` or shows a `notice`. A completed permission prompt triggers a fresh read. The launcher owns pin confirmation. |
| Mood preview | [`useDashboard.ts`](src/useDashboard.ts) starts in `live`, enters `preview` on a mood tap, and returns to `live` when Live is selected. [`activity.ts`](src/activity.ts) derives the live mood from today’s reviews. Android renders the widget portrait from the same count. |
| Background transparency | [`widgetRefresh.ts`](src/widgetRefresh.ts) saves the slider value immediately and schedules one publication. Leaving the app flushes it. If a refresh is already rendering or reading, it takes over the publication. A failed refresh can apply the saved backdrop to the previous publication. |
| Theme and launcher icon | [`AnkiActivityModule.kt`](modules/anki-activity/android/src/main/java/expo/modules/ankiactivity/AnkiActivityModule.kt) persists the selected theme before reconciling the enabled launcher alias in [`WidgetTheme.kt`](modules/anki-activity/android/src/main/java/expo/modules/ankiactivity/WidgetTheme.kt). The aliases open the dashboard through a short-lived entry activity so Android can change the launcher icon while the dashboard stays open. Later reads retry reconciliation. The dashboard and widget use the saved theme. |
| Background registration | [`widgetRefresh.ts`](src/widgetRefresh.ts) moves from `unchecked` to `registering` when the dashboard sees ready activity. It reuses an existing Expo registration, enters `registered` on success, and returns to `unchecked` on failure so a later refresh can retry. Expo and Android own subsequent runs. |
| Widget layout and taps | [`AnkiWidget.tsx`](src/AnkiWidget.tsx) selects `compact` or `tall` by height and adjusts the presentation for the width reported by the launcher. The Expo Widgets [patch](patches/expo-widgets@58.0.29.patch) forwards those dimensions and routes widget taps to the dashboard. Android owns the launcher layout and widget instances. |
| App updates | [`AppUpdates.tsx`](src/AppUpdates.tsx) checks for a release and manages the download and installer handoff. The native module verifies the downloaded APK before opening the installer. Android owns install permissions and confirmation. |
