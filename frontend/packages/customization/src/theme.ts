// Appearance preference (light / dark) — API kept for AccountMenu compat.
//
// Visual authority is the build-time THEME (@playlovetoys/design-system).
// Dark looks come from THEME=nocturne|docs (etc.), not a `.dark` remap.
// applyTheme / initTheme only ensure data-theme="brand" and clear `.dark`.

import { THEME_KEY } from './keys';
import { readString, writeString } from './storage';

export type Theme = 'light' | 'dark';

/**
 * Cookie kept for SPA shell compat; no longer drives `.dark` remaps.
 */
export const THEME_COOKIE = 'dar-theme';

function writeThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

/** The user's explicitly-chosen theme, or null if they never picked. */
export function getStoredTheme(): Theme | null {
  const value = readString(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

/** The OS / browser preference, used as the default before any choice. */
export function systemTheme(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/** Effective theme: the saved choice if any, else the system default. */
export function resolveTheme(): Theme {
  return getStoredTheme() ?? systemTheme();
}

/**
 * Reflect DS brand theme onto the document. Ignores light/dark preference —
 * build-time THEME owns the palette.
 */
export function applyTheme(_theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'brand');
}

/** Persist a chosen preference (for AccountMenu) without remapping colors. */
export function setTheme(theme: Theme): void {
  writeString(THEME_KEY, theme);
  writeThemeCookie(theme);
  applyTheme(theme);
}

/** Apply brand theme before first paint. */
export function initTheme(): void {
  applyTheme(resolveTheme());
  const stored = getStoredTheme();
  if (stored) writeThemeCookie(stored);
}
