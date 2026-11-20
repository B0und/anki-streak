#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

local_build_tools="$HOME/.local/share/anki-streak-build"
if [[ -z "${JAVA_HOME:-}" && -x "$local_build_tools/jdk/bin/java" ]]; then
  export JAVA_HOME="$local_build_tools/jdk"
fi
if [[ -z "${ANDROID_HOME:-}" ]]; then
  export ANDROID_HOME="${ANDROID_SDK_ROOT:-$local_build_tools/sdk}"
fi
if [[ ! -d "$ANDROID_HOME/platforms" ]]; then
  printf '%s\n' 'Set ANDROID_HOME to the Android SDK directory. See the APK build requirements in README.md.' >&2
  exit 1
fi

if [[ ! -x android/gradlew ]]; then
  bunx --no-install expo prebuild --platform android --no-install
fi

cd android
exec ./gradlew :anki-activity:compileReleaseKotlin :anki-activity:lintRelease -PreactNativeArchitectures=arm64-v8a
