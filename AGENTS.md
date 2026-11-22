# Releases

Publish a new stable GitHub release for every completed app change. Follow the [release requirements](README.md#build-an-apk) for the version bump, signing key, tag, and APK filename. Verify that the public release and APK are downloadable, then include the release link in the handoff. Report the exact blocker if publication fails.

# Pixel ADB

Follow the [Pixel ADB guide](docs/pixel-adb.md) when connecting to or testing on the paired Pixel.

# App state

Use XState actors for app state and lifecycle. Use actor delays for state transitions and Effect schedules for Effect work.

# App and widget design

For widget design, refresh, scheduling, or publication changes, follow the [widget verification guide](.agents/skills/verify-widget-refresh/SKILL.md). Keep the model and actor checks current when changing refresh or publication behavior.

When implementing from a screenshot, follow the [Android screenshot workflow](docs/widget-screenshots.md) to measure the reference and compare it with a device capture.

# Effect and TypeScript

Write helper scripts in TypeScript and run them with Bun. Use Bash for short shell orchestration.

Before writing Effect code, read `node_modules/effect/AGENTS.md` completely and follow the relevant examples. Check `node_modules/effect/src` for the installed API. For Effect boundaries, lifecycle, lint changes, or upstream examples, read the [engineering guide](docs/engineering.md).

Before handing off code changes, run `bun run check` locally. GitHub Actions is reserved for publishing the signed APK. For behavior changes, also exercise the changed entry point. Give each suppression the exact rule, the smallest scope, and the reason next to the code.
