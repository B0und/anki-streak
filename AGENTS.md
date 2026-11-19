# Releases

Publish a new stable GitHub release for every completed app change. Follow the [release requirements](README.md#build-an-apk) for the version bump, signing key, tag, and APK filename. Verify that the public release and APK are downloadable, then include the release link in the handoff. Report the exact blocker if publication fails.

# Pixel ADB

Check `adb devices -l`, then SDK `adb mdns services` for `_adb-tls-connect._tcp`. If discovery fails, use `adb connect pixel-9-pro-xl:<port>` with the current main Wireless debugging screen port. A rotated port keeps existing pairing.
