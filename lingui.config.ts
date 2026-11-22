import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ru'],
  catalogs: [{ path: '<rootDir>/src/locales/{locale}/messages', include: ['src'], exclude: ['src/locales/**'] }],
  format: formatter({ lineNumbers: false }),
  experimental: { runtimeMacro: true },
});
