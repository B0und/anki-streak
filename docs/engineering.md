# Engineering guide

## Local checks and language servers

Use Node 24 or later, Bun, and the [Android build prerequisites](../README.md#build-an-apk). Install with `bun install --frozen-lockfile`. Run `bun run check` locally before handoff. It runs Effect-patched TSRS, type-aware Oxlint, widget refresh verification, Kotlin compilation, and Android Lint for `anki-activity`. The native check generates the Android project on the first run. The [widget refresh verification skill](../.agents/skills/verify-widget-refresh/SKILL.md) describes the TLA+ model checked by `tla-ts` and the production actor coverage.

For an editor with custom LSP commands, launch `bun run lsp:effect` from the repo root to run Effect-patched TSRS over stdio. Register it for TypeScript, TSX, JavaScript, and JSX. Use `bun run lsp:lint` for Oxlint and enable one server per role.

For VS Code, the workspace recommends the Oxc extension and selects the native TypeScript workspace SDK. After installing dependencies, run `bunx --no-install effect-tsgo patch --typescript`, select the workspace TypeScript version, and reload the editor. Repeat the patch after reinstalling TypeScript. [Effect language service](https://github.com/Effect-TS/tsgo) · [Oxc editor setup](https://oxc.rs/docs/guide/usage/linter/editors.html)

## Read the installed API first

Start with `node_modules/effect/AGENTS.md`. Follow its examples for Schema, services, schedules, resources, or testing. Search `node_modules/effect/src` before using an unfamiliar API. The installed Effect and `@xstate/effect` versions are the authority for what this app can call.

Run `bun run refs:sync` for searchable shallow checkouts under `.agent_sources/`. The Effect ref follows the exact app dependency. The other refs are fixed in the [sync script](../scripts/sync-agent-sources.sh). Search the mirrors with `rg -n --no-ignore 'pattern' .agent_sources/effect/packages/effect/src`. A first sync downloads several hundred MB. These checkouts are local research material and are ignored by git and Oxlint.

| Mirror | Start here |
| --- | --- |
| `effect` | `.agents/AGENTS.md`, `ai-docs/src`, `packages/effect/SCHEMA.md`, and `packages/effect/{src,test}` for implementation and behavioral examples |
| `alchemy` | `AGENTS.md` sections on reconciliation, typed errors, and provider testing. Read `packages/alchemy/src/Provider.ts` and `packages/alchemy/src/Stack.ts` for interfaces, composition, and replay-safe work |
| `executor` | `packages/sdk/src/contracts/executor.ts`, `packages/sdk/src/core.ts`, `packages/sdk/src/implementation/runtime.ts`, and `e2e/README.md` for schema-owned contracts, runtime boundaries, and tests through actual entry points |
| `rat-stack` | `packages/core/src/file-inspector.ts` for a service layer, `packages/core/src/inspect-machine.ts` for Effect-backed actors, and `skills/gardener/SKILL.md` for maintaining checks. Start at [ratstack.sh/llms.txt](https://ratstack.sh/llms.txt) for the site guides |
| `slack-listener` | `.oxlintrc.json` and `PRINCIPLES.md` for deterministic boundaries, `src/core.ts` for pure decisions, and `src/sim/runtime.ts` for exercising the production Effect program with controlled time and services |

## Model boundaries and lifetime

- Treat provider, network, and native return values as `unknown` until they cross a boundary. Decode them with Effect Schema once and derive the domain type from the schema. Keep the decoded type through callers. See [AnkiDroid activity](../src/activity.ts) and [release decoding](../src/appUpdateRelease.ts).
- Use a discriminated union when each state carries different data. Keep decisions pure when they can run on data alone. Give retry, queue, timeout, and interval values names with units. Use a typed error when a caller can act on a failure and preserve the underlying cause at the adapter.
- Let XState own UI events, transitions, and cancellation. Declare Effect logic as an actor so its requirements and lifetime are visible. Use a delayed transition for a delay owned by actor state. Effect work uses `Effect.sleep`, `Effect.timeout`, or `Schedule` according to the operation. Read time via Effect's `Clock` or `DateTime` in Effect code. Keep frame callbacks and Android background jobs in their platform lifecycle. The two existing raw timer owners, the count-up animation and app update polling, have line-level migration exceptions and clean up on stop.
- Use `Effect.gen` inline and `Effect.fn` or `Effect.fnUntraced` for reusable effectful functions. Create a `Context.Service` and compose its Layer at the entry point when implementations or environments genuinely vary. Use scoped acquisition and release for resources with a lifetime. Keep `Effect.runPromise` at native or actor entry points and propagate the caller's cancellation signal when available. See [widget refresh](../src/widgetRefresh.ts) and [widget preview](../src/WidgetPreview.tsx).
- Exercise behavior through its normal entry point. Substitute platform services at their boundary so the test runs the same Effect or actor. For timing use Effect's test clock or an injected actor clock. For retryable writes, cover a partial failure followed by a retry. For state transitions with several valid event orders, test sequences that can break an invariant.

## Maintain the lint rules

The [Oxlint config](../.oxlintrc.json) is the active policy. [Dillon Mulroy’s anti-slop plugin](../tools/oxlint/anti-slop/UPSTREAM.md) is vendored with its license. This app allows `unknown` at real boundaries. It uses established formatting and permits ordinary view branches. The rule that requires a nearby `SAFETY:` invariant applies when an assertion is unavoidable.

When adding a rule, prove it rejects an example and accepts the intended replacement. Give the diagnostic enough detail to fix it. Use a next-line exception when a platform boundary requires one, and explain the invariant or lifecycle in the directive. Keep Oxlint and `@oxlint/plugins` on the same version. Check the [Effect compiler compatibility matrix](https://github.com/Effect-TS/tsgo#supported-package-versions) before changing the tool versions.
