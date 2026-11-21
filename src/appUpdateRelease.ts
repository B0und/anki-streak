import { Effect, Schema } from 'effect';
import { requireNativeModule } from 'expo';

export const appUpdater = requireNativeModule<{
  addListener(event: 'downloadProgress', listener: (event: unknown) => void): { remove(): void };
  getInstalledBuild(): { version: string; canUpdate: boolean };
  canInstallUpdates(): boolean;
  openInstallSettings(): Promise<void>;
  downloadUpdate(tag: string, digest: string, size: number): Promise<void>;
  installUpdate(): Promise<void>;
}>('AppUpdate');

const repository = 'B0und/anki-streak';
const apkName = 'Anki-Streak.apk';
const requestTimeoutMs = 15_000;

type Version = [major: number, minor: number, patch: number];

function parseVersion(value: string): Version | null {
  const parts = value.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^(0|[1-9]\d*)$/.test(part))) return null;
  const [major, minor, patch] = parts.map(Number);
  if (major === undefined || minor === undefined || patch === undefined ||
    ![major, minor, patch].every(Number.isSafeInteger)) return null;
  return [major, minor, patch];
}

function isNewer(candidate: Version, installed: Version): boolean {
  const [major, minor, patch] = candidate;
  const [installedMajor, installedMinor, installedPatch] = installed;
  if (major !== installedMajor) return major > installedMajor;
  if (minor !== installedMinor) return minor > installedMinor;
  return patch > installedPatch;
}

export type AppUpdate = { tag: string; version: string; digest: string; size: number };

const downloadProgress = Schema.Struct({
  tag: Schema.String,
  bytesReceived: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  bytesPerSecond: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});
export type DownloadProgress = typeof downloadProgress.Type;
export const decodeDownloadProgress = Schema.decodeUnknownOption(downloadProgress);

const apkMetadata = Schema.Struct({
  browser_download_url: Schema.String,
  state: Schema.Literal('uploaded'),
  digest: Schema.String.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/)),
  size: Schema.Int.check(Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(128 * 1024 * 1024)),
});
const releaseWithAssets = Schema.Struct({
  draft: Schema.Literal(false),
  prerelease: Schema.Literal(false),
  tag_name: Schema.String,
  assets: Schema.Array(Schema.Struct({ name: Schema.String, browser_download_url: Schema.optionalKey(Schema.Unknown),
    state: Schema.optionalKey(Schema.Unknown), digest: Schema.optionalKey(Schema.Unknown), size: Schema.optionalKey(Schema.Unknown) })),
});

class ReleaseCheckError extends Schema.TaggedError<ReleaseCheckError>()('ReleaseCheckError', {
  reason: Schema.String,
}) {}

export const checkForAppUpdate = Effect.fnUntraced(function*(installed: string) {
  const body = yield* Effect.tryPromise({
    try: async (signal) => {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal,
      });
      if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
      return response.json();
    },
    catch: (cause) => new ReleaseCheckError({ reason: String(cause) }),
  });
  const release = yield* Schema.decodeUnknownEffect(releaseWithAssets)(body);
  const tag = release.tag_name;
  if (tag === 'v0') return null;
  const version = tag.slice(1);
  const candidate = tag.startsWith('v') && parseVersion(version);
  const current = parseVersion(installed);
  if (!candidate || !current) return yield* new ReleaseCheckError({ reason: 'Invalid app version' });
  if (!isNewer(candidate, current)) return null;

  const apk = yield* Schema.decodeUnknownEffect(apkMetadata)(release.assets.find((asset) => asset.name === apkName));
  if (apk.browser_download_url !== `https://github.com/${repository}/releases/download/${tag}/${apkName}`) {
    return yield* new ReleaseCheckError({ reason: 'Unexpected release APK address' });
  }
  return { tag, version, digest: apk.digest.slice('sha256:'.length), size: apk.size } satisfies AppUpdate;
}, Effect.timeout(requestTimeoutMs));
