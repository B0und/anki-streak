# Anki Streak

An Android home-screen widget and React Native companion app. Your chosen character looks sad until you answer a card in AnkiDroid, then smiles. Choose a widget layout to highlight your reviews, streak, or review history.

## Add the widget

1. Install Anki Streak on the same phone as AnkiDroid 2.24 or later.
2. Open **Anki Streak**, tap **Connect AnkiDroid**, and allow access. AnkiDroid names its API permission “read and write.” Anki Streak only queries review counts.
3. Tap **Add home screen widget** and confirm the launcher prompt. If your launcher has no prompt, touch and hold the home screen and find **Anki Streak** in its widget picker.

Answering the same card multiple times counts as one card for that study day. The heatmap uses Monday–Sunday rows and highlights the current study day. It uses AnkiDroid’s default 4 a.m. rollover for weekday labels. Brighter cells mark busier days. Both averages cover the last 30 completed Anki study days, including days with zero. A new card counts on the day you first answer it. The streak includes yesterday if your current Anki study day is still open and you haven't answered a card. The app refreshes the widget when you open it. Android schedules background refreshes with a 15-minute minimum interval. Opening **Anki Streak** refreshes your totals and the widget.

Tap the widget to open Anki Streak. Choose **Miku**, **2B**, or **Emilia** in the app to change the artwork, palette, and launcher icon. Use **Background transparency** to fade the black panel behind the artwork and stats. Long-press the widget and drag the horizontal or vertical handles to resize it. The theme and background setting apply to every Anki Streak widget on your phone.

## Today, themes, and widget layouts

**Today** shows your streak, today's reviews and first-time answers, both daily averages, and the full heatmap. In **Widget**, use **Character** to change the character across the app and home-screen widget. The preview starts with today's mood. Tap the face to preview the other mood. If you pin widgets with different dimensions, choose the one you want to preview. Tap **Layout** to choose Compact and Tall designs in the same picker. **Study Pulse** is a compact layout with a portrait on the left and three stats below today's count. **Daily Progress** shows today’s reviews and your streak, with daily averages in Compact and this week’s progress in Tall. **Daily Focus** and **Streak First** emphasize a single number.

In **Settings**, see how AnkiDroid sync works and check when Anki Streak last read your data. Follow Android's appearance and language or choose a light or dark appearance and English or Russian. You can also choose a celebration for the first review, clearing due reviews, a daily review target, a daily new-card target, or every set number of streak days. Set the target and turn notifications and the count-up animation on or off independently. The app celebrates once per day, using a 4 a.m. local reset for the reward. Android schedules background checks, so notifications can arrive after you finish studying.

## Update the app

Install an updater-enabled APK once to enable update checks. Anki Streak checks GitHub Releases when you open the app and every five minutes while it is active. The Settings tab shows a badge when an update is available. **Check for updates** in Settings runs a check immediately.

When an update appears, tap **Download and install**. If Android opens its install permission settings, allow installs from Anki Streak, return to the app, and tap **Install update**. Confirm the update in the Android installer. In-place updates keep app settings and pinned widgets.

The in-app updater is available on Android 8.0 or later with the project's release-signed APK. Development builds use a separate signing key and are updated with a matching development APK.

## Build an APK

Use Bun, a Node.js release supported by Expo (22.19 or newer), unzip, JDK 21, and the Android SDK. Install Android SDK Platform 37.0, Build-Tools 37.0.0, NDK 27.1.12297006, and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`.

```sh
bun install --frozen-lockfile
bunx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK is at `android/app/build/outputs/apk/release/app-release.apk` relative to the project root. It is signed with the local development key for sideloading. The APK includes the JavaScript bundle and runs without Metro.

For a GitHub release, set `expo.version` in `app.json` to the release version and increase `expo.android.versionCode`. Sign the APK with the existing release key. Publish a stable release tagged `vMAJOR.MINOR.PATCH` and upload the APK as `Anki-Streak.apk`. Place it at `dist/<tag>/Anki-Streak.apk` and run `scripts/publish-release.sh <tag> <release-notes.md>` from the project root. This pushes the signed APK to a staging branch and GitHub Actions publishes the release using its repository token. After you verify the public release, delete the staging branch with `git push origin --delete release-assets/<tag>`. The updater reads the version from the tag and the SHA-256 digest from GitHub's asset metadata.

### APK size and character art

The release script checks the signed APK before staging it, and the publisher repeats the same check against the tagged source. The APK has a 28 MB budget for everything outside the character portraits. Each waiting and happy portrait has its own 800 kB budget, so a new character has room for up to 1.6 MB of art. Check a built APK locally with `bun scripts/check-apk-size.ts path/to/Anki-Streak.apk`.

Place new character art in the Android module’s `drawable-nodpi` directory as `<character>_waiting.webp` and `<character>_happy.webp`. Encode each with `cwebp -lossless -exact -m 6 -q 100 input.png -o output.webp`. In lossless mode, `-q 100` sets the encoder’s compression effort. Use the Android drawable name in the theme so the app and launcher share one copy. Compare the decoded RGBA pixels and dimensions to the original before replacing it. Review any budget change along with the files that need the extra space.

Generate the character's app and widget colors from one seed using the [character palette workflow](docs/character-palettes.md).

## State transitions

The dashboard and its screens observe XState 6 actors. Effect 4 handles provider validation, cancellable release checks, and Android requests. Android owns launcher dimensions, OS permissions, and background scheduling. See the [glossary](GLOSSARY.md) for app terms.

| Flow | Owner |
| --- | --- |
| App preferences and Android requests | [Dashboard actor](src/dashboardMachine.ts). Starts a read on foreground, persists appearance changes, and runs one Android request at a time. |
| Widget updates | [Refresh actor](src/widgetRefresh.ts). Concurrent reads join one refresh, appearance changes are debounced, and the latest completed publication survives a thrown refresh failure. |
| Updates | [Update actor](src/updateMachine.ts). Checks, downloads, and hands the APK off to the Android installer. Android verifies the APK signature and owns installation. |
| Rewards | [Settings actor](src/rewardSettingsMachine.ts) tracks permission and target edits. [Celebration](src/celebrationMachine.ts) and [count-up](src/countUpMachine.ts) actors own display timing. |
| Widget preview | [Widget preview](src/WidgetPreview.tsx) and the launcher share the Expo Widgets layout. The [patch](patches/expo-widgets@58.0.29.patch) hosts native previews and supplies launcher dimensions. |
