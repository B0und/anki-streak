import { requireNativeModule } from 'expo';

export const appearanceOptions = ['system', 'light', 'dark'] as const;
export const languageOptions = ['system', 'en', 'ru'] as const;
export const widgetSizes = ['compact', 'tall'] as const;
export type WidgetSize = (typeof widgetSizes)[number];

export const widgetLayouts = ['current', 'focus', 'first'] as const;
export const milestones = ['firstReview', 'finishDue', 'reviewTarget', 'newTarget', 'streakTarget'] as const;

export type Appearance = (typeof appearanceOptions)[number];
export type LanguagePreference = (typeof languageOptions)[number];
export type WidgetLayout = (typeof widgetLayouts)[number];
export type Milestone = (typeof milestones)[number];

export const defaultTargets = { reviewTarget: 20, newTarget: 5, streakTarget: 7 };

export const settings = requireNativeModule<{
  getPreference(key: string): string | null;
  setPreference(key: string, value: string): void;
  getSystemLanguage(): string;
  getNotificationAccess(): boolean;
  requestNotificationAccess(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  recordMilestone(day: string, animate: boolean, notify: boolean, title: string, body: string, channel: string): void;
  takeCelebration(day: string): boolean;
}>('StudyPreferences');

export function preference<T extends string>(key: string, values: readonly T[], fallback: T): T {
  const stored = settings.getPreference(key);
  return values.find((value) => value === stored) ?? fallback;
}

export function getLanguage() {
  const choice = preference('language', languageOptions, 'system');
  return choice === 'system' ? (settings.getSystemLanguage() === 'ru' ? 'ru' : 'en') : choice;
}

export function getWidgetLayout(size: WidgetSize) {
  return preference(`layout-${size}`, widgetLayouts, preference('layout', widgetLayouts, 'current'));
}

export function getWidgetLayouts(): Record<WidgetSize, WidgetLayout> {
  return { compact: getWidgetLayout('compact'), tall: getWidgetLayout('tall') };
}

export function hasTarget(milestone: Milestone): milestone is keyof typeof defaultTargets {
  return milestone in defaultTargets;
}

export function getTarget(key: keyof typeof defaultTargets): number {
  const target = Number(settings.getPreference(key));
  return Number.isInteger(target) && target >= 1 && target <= 9999 ? target : defaultTargets[key];
}
