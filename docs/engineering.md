# Engineering guide

## Effect boundaries

- Decode provider, network, and native responses with Effect Schema at their boundary. Derive domain types from the schemas and pass those types through callers. [AnkiDroid activity](../src/activity.ts) · [Release decoding](../src/appUpdateRelease.ts)
- Run Effect at actor or native entry points and pass through the caller's cancellation signal. Use scoped acquisition for resources that need cleanup. Keep frame callbacks and Android background jobs in their platform lifecycle. [Widget refresh](../src/widgetRefresh.ts)
- Test through the normal entry point and substitute platform services at their boundary. Use a test clock for timing. For retryable writes, exercise a partial failure followed by a retry.

## Lint changes

When adding a rule, prove it rejects a failing example and accepts the intended replacement. Give the diagnostic enough detail to fix the issue. [Oxlint config](../oxlint.config.mts)

Keep Oxlint and `@oxlint/plugins` on the same version. Check the compiler compatibility matrix before changing tool versions. [Effect compiler compatibility](https://github.com/Effect-TS/tsgo#supported-package-versions)

## Upstream examples

The sync script pins shallow checkouts under `.agent_sources/`. The first sync can download several hundred MB. Use `rg --no-ignore` to search the ignored checkouts. [Package scripts](../package.json) · [Reference sync script](../scripts/sync-agent-sources.sh)

| Mirror | Start here |
| --- | --- |
| `effect` | `packages/effect/SCHEMA.md` for schemas and `packages/effect/test` for behavior. |
| `alchemy` | `AGENTS.md`, `packages/alchemy/src/Provider.ts`, and `packages/alchemy/src/Stack.ts` for reconciliation and replay-safe writes. |
| `executor` | `packages/sdk/src/contracts/executor.ts`, `packages/sdk/src/implementation/runtime.ts`, and `e2e/README.md` for contracts and tests through entry points. |
| `rat-stack` | `packages/core/src/file-inspector.ts` and `packages/core/src/inspect-machine.ts` for services and Effect-backed actors. |
| `slack-listener` | `PRINCIPLES.md`, `src/core.ts`, and `src/sim/runtime.ts` for pure decisions and tests with controlled time. |
