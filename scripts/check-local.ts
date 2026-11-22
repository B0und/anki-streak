import { accessSync, constants } from 'node:fs';

type Check = [name: string, command: string[]];

const android: Check = ['Android', ['bash', 'scripts/check-android.sh']];
const checks: Check[] = [
  ['TypeScript lint', ['bun', 'run', 'lint']],
  ['TypeScript', ['bun', 'run', 'typecheck']],
  ['Portrait assets', ['bun', 'scripts/check-apk-size.ts']],
  ['Character palettes', ['bun', 'scripts/generate-character-palettes.ts', '--check']],
  ['Translations', ['bun', 'scripts/check-locales.ts']],
  ['Widget model', ['bun', 'scripts/check-widget-model.ts']],
  ['Widget refresh', ['bun', 'scripts/check-widget-refresh.ts']],
];

async function run([name, command]: Check) {
  console.log(`Running ${name}…`);
  const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  console.log([`\n${name} ${status === 0 ? 'passed' : `failed (exit ${status})`}`, output].filter(Boolean).join('\n'));
  return status;
}

let nativeStatus = 0;
let androidReady = false;
try {
  accessSync('android/gradlew', constants.X_OK);
  androidReady = true;
} catch {
  // Expo prebuild can write project files. Finish it before running readers.
  nativeStatus = await run(android);
}
if (androidReady) checks.push(android);
const statuses = await Promise.all(checks.map(run));
if (nativeStatus || statuses.some((status) => status !== 0)) process.exitCode = 1;
