# Releases

Publish a new stable GitHub release for every completed app change. Follow the [release requirements](README.md#build-an-apk) for the version bump, signing key, tag, and APK filename. Verify that the public release and APK are downloadable, then include the release link in the handoff. Report the exact blocker if publication fails.

# Pixel ADB

Recover the paired Pixel before asking for connection details.

1. Run `adb devices -l`. Use an entry marked `device` with `adb -s <serial>` for every subsequent command. The Tailscale IP and hostname can both appear for the same phone.
2. For an offline entry, check `tailscale status` and retry `adb connect pixel-9-pro-xl:<last-port>` with the port from that entry. Recheck `adb devices -l` as the peer comes back online. If the peer is offline, a timeout on the old port does not establish that the port changed.
3. If the peer is reachable and the old address still fails, run `adb mdns services` with the SDK binary at `~/.local/share/anki-streak-build/sdk/platform-tools/adb` to find `_adb-tls-connect._tcp`. If the shared ADB server returns `unknown host service`, run the SDK binary with `-P 5038 start-server` and use `-P 5038` for discovery and connection. On the same LAN, `timeout 5 avahi-browse -rt _adb-tls-connect._tcp` is another discovery path. Connect to the discovered address and reuse the existing pairing. Stop only a separate server you started.
4. Before driving UI, check `adb -s <serial> shell dumpsys window` for `isKeyguardShowing=false`. Launch the app as soon as it unlocks. Confirm app state with `uiautomator dump` after each action. After reopening the picker, wait for the deck row to load before checking its saved value. If the phone locks during verification, preserve the current test state and resume when it unlocks.

# App state

Use XState actors for app state and lifecycle. Use actor delays for state transitions and Effect schedules for Effect work.

# App and widget design

Use the project-local [Impeccable skill](.agents/skills/impeccable/SKILL.md) for UI changes. Follow the [launcher parity check](.agents/skills/verify-widget-refresh/SKILL.md#verify-launcher-parity) for widget design changes.

# Effect and TypeScript

Before writing Effect code, read `node_modules/effect/AGENTS.md` completely and follow the relevant examples. Check `node_modules/effect/src` for the installed API. For schemas, services, actor lifecycles, or lint changes, read the [engineering guide](docs/engineering.md). It maps local examples and pinned upstream sources.

Before handing off code changes, run `bun run check` locally. GitHub Actions is reserved for publishing the signed APK. For behavior changes, also exercise the changed entry point. Give each suppression the exact rule, the smallest scope, and the reason next to the code.

When changing widget refresh, publication, or appearance scheduling, read the [widget refresh verification skill](.agents/skills/verify-widget-refresh/SKILL.md) and keep its model and actor checks current.
