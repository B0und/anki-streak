import { accessSync, constants } from 'node:fs';

const android = ['Android', ['bash', 'scripts/check-android.sh']];
const checks = [
  ['TypeScript lint', ['bun', 'run', 'lint']],
  ['TypeScript', ['bun', 'run', 'typecheck']],
  ['Widget model', ['bun', 'scripts/check-widget-model.mjs']],
  ['Widget refresh', ['bun', 'scripts/check-widget-refresh.mjs']],
];

async function run([name, command]) {
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
