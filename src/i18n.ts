// Hermes needs plural rules before the app or a background widget formats a message.
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill-force.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';
import { setupI18n } from '@lingui/core';

import { messages as en } from './locales/en/messages';
import { messages as ru } from './locales/ru/messages';

const locales = {
  en: setupI18n({ locale: 'en', messages: { en } }),
  ru: setupI18n({ locale: 'ru', messages: { ru } }),
};

export type Language = keyof typeof locales;

export function getI18n(language: Language) {
  return locales[language];
}
