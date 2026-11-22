import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../lingui.config';

const root = fileURLToPath(new URL('..', import.meta.url));
const lingui = join(root, 'node_modules/.bin/lingui');

execFileSync(lingui, ['check', 'sync', '--clean', '--overwrite'], { cwd: root, stdio: 'inherit' });
execFileSync(lingui, ['check', 'missing', '--mode', 'catalog'], { cwd: root, stdio: 'inherit' });

const directory = mkdtempSync(join(tmpdir(), 'anki-locales-'));
try {
  cpSync(join(root, 'lingui.config.ts'), join(directory, 'lingui.config.ts'));
  cpSync(join(root, 'src/locales'), join(directory, 'src/locales'), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
  execFileSync(lingui, ['compile', '--typescript', '--strict'], { cwd: directory, stdio: 'inherit' });
  for (const locale of config.locales) {
    const catalog = join('src/locales', locale, 'messages.ts');
    assert.ok(readFileSync(join(root, catalog)).equals(readFileSync(join(directory, catalog))),
      `${catalog} is stale. Run bun run compile.`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}

// Start Lingui with the same missing constructor as Android's Hermes runtime.
Reflect.deleteProperty(Intl, 'PluralRules');
const { getI18n } = await import('../src/i18n');
const { messages } = await import('../src/messages');
assert.equal(getI18n('en').t(messages.historyWeeks.id, { count: 1 }), '1 week');
assert.equal(getI18n('ru').t(messages.historyWeeks.id, { count: 22 }), '22 недели');
