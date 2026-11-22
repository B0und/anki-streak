import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appBudget = 28_000_000;
const portraitBudget = 800_000;
const portraitDirectory = fileURLToPath(new URL('../modules/anki-activity/android/src/main/res/drawable-nodpi/', import.meta.url));
const bytes = new Intl.NumberFormat('en-US');
const digestOf = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const deflated = (method: string | undefined) => /^def[NSFX]$/.test(method ?? '');

function isLosslessWebp(data: Buffer) {
  if (data.length < 12 || data.toString('ascii', 0, 4) !== 'RIFF'
    || data.toString('ascii', 8, 12) !== 'WEBP' || data.readUInt32LE(4) + 8 !== data.length) return false;

  const images: string[] = [];
  let offset = 12;
  while (offset + 8 <= data.length) {
    const chunk = data.toString('ascii', offset, offset + 4);
    const length = data.readUInt32LE(offset + 4);
    if (['VP8 ', 'VP8L', 'ANIM', 'ANMF'].includes(chunk)) images.push(chunk);
    offset += 8 + length + (length % 2);
  }
  return offset === data.length && images.length === 1 && images[0] === 'VP8L';
}

function checkPortraits() {
  const seen = new Map<string, string>();
  const portraits = [];
  for (const name of readdirSync(portraitDirectory).toSorted()) {
    if (!/_(waiting|happy)(\.[^.]+)?$/.test(name)) continue;
    const data = readFileSync(resolve(portraitDirectory, name));
    if (data.length > portraitBudget) {
      throw new Error(`${name} is ${bytes.format(data.length)} bytes. The portrait budget is ${bytes.format(portraitBudget)} bytes.`);
    }
    if (!name.endsWith('.webp') || !isLosslessWebp(data)) throw new Error(`${name} must be a lossless WebP portrait.`);
    const digest = digestOf(data);
    const duplicate = seen.get(digest);
    if (duplicate) throw new Error(`${name} duplicates ${duplicate}. Reuse the same drawable.`);
    seen.set(digest, name);
    portraits.push({ name, size: data.length, digest });
  }
  if (!portraits.length) throw new Error('No character portraits found.');
  const total = portraits.reduce((sum, portrait) => sum + portrait.size, 0);
  process.stdout.write(`${portraits.length} lossless portraits checked (${bytes.format(total)} bytes).\n`);
  return portraits;
}

function apkEntries(path: string) {
  // ZipInfo lists compressed sizes and methods without extracting the APK.
  const listing = execFileSync('unzip', ['-Z', '-l', path], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  const entries = Array.from(listing.matchAll(/^\S+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+(\d+)\s+(\S+)\s+\S+\s+\S+ (.+)$/gm),
    ([, size, compressedSize, method, name]) => ({ size: Number(size), compressedSize: Number(compressedSize), method, name: name ?? '' }));
  const count = /number of entries: (\d+)/.exec(listing)?.[1];
  if (entries.length !== Number(count)) throw new Error('Could not read the APK entry list.');
  return entries;
}

function checkApk(path: string, portraits: ReturnType<typeof checkPortraits>) {
  const entries = apkEntries(path);
  const libraries = entries.filter(({ name }) => name.startsWith('lib/') && name.endsWith('.so'));
  if (!libraries.length || libraries.some(({ method }) => !deflated(method))) {
    throw new Error('The APK must include compressed native libraries.');
  }
  const bundles = entries.filter(({ name }) => name === 'assets/index.android.bundle');
  if (bundles.length !== 1 || !deflated(bundles[0]?.method)) throw new Error('The APK must include a compressed JavaScript bundle.');

  const sizes = new Set(portraits.map(({ size }) => size));
  const candidates = entries.filter(({ size }) => sizes.has(size)).map((entry) => {
    const pattern = entry.name.replaceAll(/[?*[\\]/g, String.raw`\$&`);
    return { ...entry, digest: digestOf(execFileSync('unzip', ['-p', path, pattern], { maxBuffer: 4 * portraitBudget })) };
  });
  let portraitBytes = 0;
  for (const { name, digest } of portraits) {
    const matches = candidates.filter((entry) => entry.digest === digest);
    const [match] = matches;
    if (matches.length !== 1 || !match?.name.startsWith('res/')) {
      throw new Error(`${name} must be bundled once as an Android resource. Found ${matches.length} copies.`);
    }
    portraitBytes += match.compressedSize;
  }

  const size = statSync(path).size;
  const base = size - portraitBytes;
  if (base > appBudget) {
    throw new Error(`The APK without portraits is ${bytes.format(base)} bytes. The app budget is ${bytes.format(appBudget)} bytes.`);
  }
  process.stdout.write(`APK ${bytes.format(size)} bytes. App ${bytes.format(base)} of ${bytes.format(appBudget)} bytes. Portraits ${bytes.format(portraitBytes)} bytes.\n`);
}

try {
  const [, , apk, extra] = process.argv;
  const usage = 'Usage: bun scripts/check-apk-size.ts [apk]';
  if (extra) throw new Error(usage);
  if (apk === '--help' || apk === '-h') process.stdout.write(`${usage}\n`);
  else {
    const portraits = checkPortraits();
    if (apk) checkApk(resolve(apk), portraits);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
