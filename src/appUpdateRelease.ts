import { requireNativeModule } from 'expo';

export const appUpdater = requireNativeModule<{
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

export async function checkForAppUpdate(installed: string): Promise<AppUpdate | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitHub release check failed with HTTP ${response.status}`);
    const release: unknown = await response.json();
    if (!isRecord(release) || release.draft !== false || release.prerelease !== false ||
      typeof release.tag_name !== 'string' || !Array.isArray(release.assets)) {
      throw new Error('Invalid GitHub release metadata');
    }

    const tag = release.tag_name;
    if (tag === 'v0') return null;
    const version = tag.slice(1);
    const candidate = tag.startsWith('v') && parseVersion(version);
    const current = parseVersion(installed);
    if (!candidate || !current) throw new Error('Invalid app version');
    if (!isNewer(candidate, current)) return null;

    const apk: unknown = release.assets.find((asset: unknown) => isRecord(asset) && asset.name === apkName);
    const downloadUrl = `https://github.com/${repository}/releases/download/${tag}/${apkName}`;
    if (!isRecord(apk) || apk.browser_download_url !== downloadUrl || apk.state !== 'uploaded' ||
      typeof apk.digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(apk.digest) ||
      typeof apk.size !== 'number' || !Number.isSafeInteger(apk.size) || apk.size <= 0) {
      throw new Error('Missing verified release APK');
    }
    return { tag, version, digest: apk.digest.slice('sha256:'.length), size: apk.size };
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
