// AccountMenu (#578) — the panel body for the sidebar's email-with-caret
// dropdown. Replaces the old "Settings" modal: same controls (theme
// toggle + Sign out) but rendered as a dropdown panel instead of a
// modal, since the controls don't warrant a dimmed-overlay modal.
//
// This component is the panel CONTENT only — the consumer wraps it in
// the shared <Popover> so outside-click + Escape close behaviour is
// inherited from the same primitive ListPage's Actions menu uses.

import { useState } from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';

import { resolveTheme, setTheme, type Theme } from '@dar/customization';
import { purgeLocalCache, useApiClient } from '@dar/data';

export interface AccountMenuProps {
  /** Hide the panel after a menu action runs (theme stays — only Sign out closes). */
  onAfterAction?: (() => void) | undefined;
  /** Email / display name shown as a small grayed caption above the controls. Optional. */
  identityLabel?: string | undefined;
  /** Role caption appended after the email (e.g. "superuser"). Optional. */
  roleLabel?: string | undefined;
}

export function AccountMenu({ onAfterAction, identityLabel, roleLabel }: AccountMenuProps) {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());
  const client = useApiClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const choose = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
    // Theme is a sticky control — keep the menu open so the operator can
    // see the change reflect immediately before deciding to close it.
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await client.logout();
    } catch {
      // Logout is idempotent server-side; even on a transient network
      // error we still bounce the user out so the UI can't pretend
      // they're still signed in.
    }
    // Drop every cached server response + per-model UI hint so a logged
    // out (or next) user can't read the previous session's data out of
    // localStorage. Then a full reload re-runs the auth gate, routing an
    // anonymous session to the login screen with clean in-memory state.
    purgeLocalCache();
    onAfterAction?.();
    window.location.reload();
  };

  const optionClass = (active: boolean): string =>
    [
      'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium',
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-base-300 text-base-content/80 hover:bg-base-200',
    ].join(' ');

  return (
    <div className="w-56 p-3">
      {identityLabel && (
        <div className="mb-2 truncate text-xs text-base-content/60" title={identityLabel}>
          Signed in as <span className="font-medium text-base-content/80">{identityLabel}</span>
          {roleLabel ? <span className="text-base-content/50"> · {roleLabel}</span> : null}
        </div>
      )}

      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-base-content/60">
        Appearance
      </div>
      <p className="mb-2 text-[11px] leading-snug text-base-content/50">
        Preference is saved for compatibility. Palette comes from the SPA build
        THEME (e.g. workbench, nocturne) — not a runtime dark remap.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          role="menuitem"
          onClick={() => choose('light')}
          className={optionClass(theme === 'light')}
          aria-pressed={theme === 'light'}
        >
          <Sun className="h-4 w-4" aria-hidden /> Light
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => choose('dark')}
          className={optionClass(theme === 'dark')}
          aria-pressed={theme === 'dark'}
        >
          <Moon className="h-4 w-4" aria-hidden /> Dark
        </button>
      </div>

      <div className="mt-3 border-t border-base-300 pt-3">
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-base-300 px-2 py-1.5 text-sm font-medium text-base-content/80 hover:bg-base-200 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
