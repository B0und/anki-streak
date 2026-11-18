# Anki Streak

An Android home-screen widget and React Native companion app. Miku looks sad until you answer a card in AnkiDroid, then smiles. The widget shows your streak, the number of cards you answered today, and a 45-day heatmap.

## Add the widget

1. Install Anki Streak on the same phone as AnkiDroid 2.24 or later.
2. Open **Anki Streak**, tap **Connect AnkiDroid**, and allow access. AnkiDroid names its API permission “read and write.” Anki Streak only queries review counts.
3. Tap **Add home screen widget** and confirm the launcher prompt. If your launcher has no prompt, touch and hold the home screen and find **Anki Streak** in its widget picker.

Answering the same card multiple times counts as one card for that study day. The streak includes yesterday if your current Anki study day is still open and you haven't answered a card. The app refreshes the widget when you open it. Android schedules background refreshes with a 15-minute minimum interval. To see an update immediately, open **Anki Streak** and tap **Refresh**.

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
