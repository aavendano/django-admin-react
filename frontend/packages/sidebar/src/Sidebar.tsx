// @dar/sidebar — the SPA navigation chrome: the brand header, the
// per-user identity menu (theme + sign out), the model filter, the
// metadata-driven app/model nav, and the responsive drawer (static
// column at ≥lg, off-canvas drawer below). The app shell composes
// <Sidebar/> next to its own <main> content region.
//
// On ≥lg the column can collapse to an icon rail (persisted via
// SIDEBAR_RAIL_KEY). Mobile/tablet keep the off-canvas drawer unchanged.

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ChevronDown,
  Download,
  Files,
  GitPullRequest,
  LayoutTemplate,
  Menu,
  PanelLeft,
  PanelLeftClose,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import {
  NAV_COLLAPSE_KEY,
  SIDEBAR_RAIL_KEY,
  usePersistedSet,
  usePersistedState,
} from '@dar/customization';
import { useRegistry } from '@dar/data';
import { AccountMenu } from '@dar/settings';
import { Popover } from '@dar/ui';

import { groupCustomPages, readCustomPages } from './customPages';

// The browser's `beforeinstallprompt` event (Chromium). Captured so we
// can show an explicit "Install" affordance and call `.prompt()` on
// click — the manifest + SW (#86) make the app installable; this
// surfaces it. Typed locally since it's not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt(): { canInstall: boolean; promptInstall: () => void } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    function onPrompt(e: Event): void {
      e.preventDefault(); // stop Chrome's mini-infobar; we drive the UI
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled(): void {
      setDeferred(null);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return {
    canInstall: deferred !== null,
    promptInstall: () => {
      if (!deferred) return;
      void deferred.prompt();
      setDeferred(null); // a prompt can only be used once
    },
  };
}

// Brand title + logo URL are written into the SpaIndexView template as
// ``<meta name="dar-brand-title">`` / ``<meta name="dar-brand-logo">``
// so the SPA picks them up on first paint with no FOUC. Defaults match
// the legacy hardcoded shell.
function readMeta(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  return el?.content?.trim() || null;
}

const BRAND_TITLE = readMeta('dar-brand-title') || 'django-admin-react';
const BRAND_LOGO_URL = readMeta('dar-brand-logo');

// Below this many total models the sidebar is short enough to scan by
// eye; the filter input only appears at/above it. Matches the
// `django.contrib.admin` sidebar Filter affordance (ACCEPTANCE N-9).
const FILTER_THRESHOLD = 8;

type RegistryModel = {
  model_name: string;
  verbose_name_plural?: string | null;
  real_app_label?: string | null;
};

type RegistryApp = {
  app_label: string;
  verbose_name: string;
  models: RegistryModel[];
};

// Capitalise the first letter only — matches Django admin's
// `capfirst(verbose_name_plural)`. An explicit `Meta.verbose_name_plural`
// like "Loan Package Metadata" is preserved; an auto-derived
// "loan packages" becomes "Loan packages".
function capfirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function modelLabel(model: RegistryModel): string {
  return capfirst(model.verbose_name_plural || model.model_name);
}

/** Fixed Lucide icons for known editorial models; Box for everything else. */
function iconForModel(modelName: string, label: string): LucideIcon {
  const key = `${modelName} ${label}`.toLowerCase();
  if (key.includes('index')) return Files;
  if (key.includes('proposal')) return GitPullRequest;
  return Box;
}

function iconForCustomPage(): LucideIcon {
  return LayoutTemplate;
}

function navLinkClass(isActive: boolean, rail: boolean): string {
  return [
    'flex items-center gap-2 rounded text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400',
    rail ? 'lg:justify-center lg:px-0 lg:py-2 px-2 py-1' : 'px-2 py-1',
    isActive ? 'bg-gray-800 font-medium text-white' : 'hover:bg-gray-800',
  ].join(' ');
}

// Keep an app when its own label matches (show all its models) or when
// at least one model label matches (show just the matching models).
// Case-insensitive substring — the same semantics as the legacy admin
// sidebar Filter. Purely client-side over the already-loaded registry;
// no API round-trip (ACCEPTANCE N-9).
function filterApps(apps: RegistryApp[], query: string): RegistryApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  const out: RegistryApp[] = [];
  for (const app of apps) {
    const appMatches =
      app.verbose_name.toLowerCase().includes(q) || app.app_label.toLowerCase().includes(q);
    if (appMatches) {
      out.push(app);
      continue;
    }
    const models = app.models.filter(
      (m) => modelLabel(m).toLowerCase().includes(q) || m.model_name.toLowerCase().includes(q),
    );
    if (models.length > 0) out.push({ ...app, models });
  }
  return out;
}

// Read once: the embedded list is fixed for the lifetime of the shell.
const CUSTOM_PAGE_GROUPS = groupCustomPages(readCustomPages());

export function Sidebar() {
  const { data } = useRegistry();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [query, setQuery] = useState('');
  // Static column on desktop (≥ lg) and a slide-in overlay drawer below
  // so it never eats horizontal space on a phone/tablet. ``drawerOpen``
  // only affects the mobile/tablet presentation.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Identity dropdown (#578) — anchored under the email-with-caret button;
  // holds the theme toggle + Sign out (was a separate Settings modal in
  // v1.0.2 and earlier).
  const [accountOpen, setAccountOpen] = useState(false);
  // Collapsed app-group sections (#227), persisted per device via
  // @dar/customization (the single home for localStorage-backed prefs).
  const [collapsed, setCollapsed] = usePersistedSet(NAV_COLLAPSE_KEY);
  // Desktop icon-rail (≥lg only). Independent of the mobile drawer.
  const [railCollapsed, setRailCollapsed] = usePersistedState(SIDEBAR_RAIL_KEY, false);
  const toggleApp = (appLabel: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(appLabel)) next.delete(appLabel);
      else next.add(appLabel);
      return next;
    });
  };

  // Memoised so the array identity is stable across renders — otherwise
  // the dependent `useMemo`s below recompute on every render
  // (react-hooks/exhaustive-deps).
  const apps = useMemo<RegistryApp[]>(() => (data?.apps ?? []) as RegistryApp[], [data?.apps]);
  const totalModels = useMemo(() => apps.reduce((n, app) => n + app.models.length, 0), [apps]);
  const showFilter = totalModels >= FILTER_THRESHOLD && !railCollapsed;
  const visibleApps = useMemo(
    () => (showFilter ? filterApps(apps, query) : apps),
    [apps, query, showFilter],
  );

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);
  const RailToggleIcon = railCollapsed ? PanelLeft : PanelLeftClose;

  return (
    <>
      {/* Top bar — hamburger + brand. Shown on mobile AND tablet; the
          static sidebar only appears at lg (≥1024px). */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-gray-900 px-4 text-gray-100">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="-ml-2 rounded p-2 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link to="/" onClick={closeDrawer} className="flex items-center gap-2 font-semibold">
          {BRAND_LOGO_URL && <img src={BRAND_LOGO_URL} alt="" className="h-5 w-5 rounded" />}
          <span className="truncate">{BRAND_TITLE}</span>
        </Link>
      </header>

      {/* Backdrop — on mobile + tablet while the drawer is open. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: static column on large screens (≥lg); off-canvas
          drawer on mobile AND tablet (< lg). Desktop can collapse to an
          icon rail (w-16) without affecting the mobile drawer width. */}
      <aside
        className={[
          'shrink-0 overflow-y-auto bg-gray-900 text-gray-100',
          'w-64 p-4',
          railCollapsed ? 'lg:w-16 lg:px-2 lg:py-4' : 'lg:w-64',
          'transition-[width] duration-200',
          // Mobile + tablet: fixed off-canvas drawer that slides in.
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-200',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          // Large screens (≥1024px): pinned, always visible, in normal flow.
          'lg:static lg:z-auto lg:translate-x-0',
        ].join(' ')}
      >
        <div className={railCollapsed ? 'mb-4 lg:mb-3' : 'mb-6'}>
          <div
            className={[
              'flex items-center gap-2',
              railCollapsed ? 'lg:flex-col lg:gap-2' : 'justify-between',
            ].join(' ')}
          >
            <Link
              to="/"
              onClick={closeDrawer}
              title={BRAND_TITLE}
              aria-label={BRAND_TITLE}
              className={[
                'flex min-w-0 items-center gap-2 text-lg font-semibold hover:text-white',
                railCollapsed ? 'lg:justify-center' : '',
              ].join(' ')}
            >
              {BRAND_LOGO_URL ? (
                <img src={BRAND_LOGO_URL} alt="" className="h-6 w-6 shrink-0 rounded" />
              ) : (
                <span
                  className={[
                    'h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-800 text-xs font-bold',
                    // Letter mark stands in for the title when the rail hides it.
                    railCollapsed ? 'hidden lg:flex' : 'hidden',
                  ].join(' ')}
                  aria-hidden
                >
                  {BRAND_TITLE.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={railCollapsed ? 'lg:hidden' : ''}>{BRAND_TITLE}</span>
            </Link>
            {/* Desktop rail toggle — hidden on the mobile/tablet drawer. */}
            <button
              type="button"
              onClick={() => setRailCollapsed(!railCollapsed)}
              aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar to icons'}
              aria-pressed={railCollapsed}
              title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 lg:inline-flex"
            >
              <RailToggleIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {/* Identity dropdown (#578): a single email-with-caret button
              replaces the v1.0.2 two-line "<email> · <role>" + Settings
              button. The dropdown is mounted via the shared <Popover>
              (outside-click + Escape inherited from the same primitive
              the list-page Actions menu uses, #575). The optional Install
              affordance stays as a sibling button — orthogonal concern. */}
          {data?.user && (
            <div
              className={[
                'mt-3 flex items-center gap-2',
                railCollapsed ? 'lg:flex-col lg:items-stretch' : '',
              ].join(' ')}
            >
              <Popover
                open={accountOpen}
                onClose={() => setAccountOpen(false)}
                align="left"
                panelClassName="text-gray-700"
                trigger={
                  <button
                    type="button"
                    onClick={() => setAccountOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    aria-label={data.user.display_name}
                    title={data.user.display_name}
                    className={[
                      'inline-flex items-center gap-1.5 rounded bg-gray-800 py-1 text-xs text-gray-200 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                      railCollapsed
                        ? 'max-w-full px-2 lg:w-full lg:justify-center lg:px-0 lg:py-2'
                        : 'max-w-full px-2',
                    ].join(' ')}
                  >
                    <User
                      className={
                        railCollapsed
                          ? 'hidden h-4 w-4 shrink-0 lg:block'
                          : 'hidden'
                      }
                      aria-hidden
                    />
                    <span className={railCollapsed ? 'truncate lg:hidden' : 'truncate'}>
                      {data.user.display_name}
                    </span>
                    <ChevronDown
                      className={[
                        'h-3.5 w-3.5 shrink-0 transition-transform',
                        accountOpen ? 'rotate-180' : '',
                        railCollapsed ? 'lg:hidden' : '',
                      ].join(' ')}
                      aria-hidden
                    />
                  </button>
                }
              >
                <AccountMenu
                  identityLabel={data.user.display_name}
                  roleLabel={data.user.is_superuser ? 'superuser' : undefined}
                  onAfterAction={() => setAccountOpen(false)}
                />
              </Popover>
              {canInstall && (
                <button
                  type="button"
                  onClick={promptInstall}
                  title="Install app"
                  aria-label="Install app"
                  className={[
                    'inline-flex items-center gap-1.5 rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                    railCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : '',
                  ].join(' ')}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span className={railCollapsed ? 'lg:hidden' : ''}>Install app</span>
                </button>
              )}
            </div>
          )}
        </div>

        {showFilter && (
          <div className="mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
              }}
              placeholder="Filter models…"
              aria-label="Filter models"
              // Bumped one step lighter than the sidebar surface (bg-gray-900)
              // so the input reads as a distinct field, not as part of the
              // sidebar (#556). `bg-gray-700` + `border-gray-600` gives the
              // same two-step contrast the rest of the app's inputs have.
              className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500"
            />
          </div>
        )}

        {/* App-group sections separated by a subtle divider line, each with
            a right-aligned caret toggle — matching the Vanta sidebar's
            grouped-nav style. */}
        {/* `border-t` draws the line above the FIRST section (the filter
            field sits above it); `divide-y` handles the lines between the
            rest. `gray-700` (one step lighter than `gray-800`, which was
            indistinguishable from the `gray-900` sidebar surface) so the
            line is actually visible (#556). */}
        <nav className="border-t border-gray-700 divide-y divide-gray-700">
          {/* Consumer pages (CUSTOM_PAGES) first: they are hand-picked
              entry points, not part of the model registry, so the model
              filter does not apply to them. */}
          {CUSTOM_PAGE_GROUPS.map(([group, pages]) => {
            const key = `custom:${group}`;
            // Icon-rail forces groups open so every page stays reachable.
            const isCollapsed = !railCollapsed && collapsed.has(key);
            const PageIcon = iconForCustomPage();
            return (
              <div key={key} className="py-3">
                <button
                  type="button"
                  onClick={() => toggleApp(key)}
                  aria-expanded={!isCollapsed}
                  className={[
                    'mb-1 flex w-full items-center justify-between gap-1 text-xs uppercase tracking-wide text-gray-400 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                    railCollapsed ? 'lg:hidden' : '',
                  ].join(' ')}
                >
                  <span className="truncate">{group}</span>
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {!isCollapsed && (
                  <ul className="space-y-1">
                    {pages.map((page) => (
                      <li key={page.path}>
                        <NavLink
                          to={`/${page.path}`}
                          onClick={closeDrawer}
                          title={page.label}
                          aria-label={page.label}
                          className={({ isActive }) => navLinkClass(isActive, railCollapsed)}
                        >
                          <PageIcon
                            className={railCollapsed ? 'h-4 w-4 shrink-0' : 'hidden'}
                            aria-hidden
                          />
                          <span className={railCollapsed ? 'lg:hidden' : ''}>{page.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {visibleApps.map((app) => {
            // While a filter query is active, force every group open so
            // matches are never hidden behind a collapsed section.
            // Icon-rail likewise keeps every model visible.
            const isCollapsed =
              !railCollapsed && !query.trim() && collapsed.has(app.app_label);
            return (
              <div key={app.app_label} className="py-3">
                <button
                  type="button"
                  onClick={() => toggleApp(app.app_label)}
                  aria-expanded={!isCollapsed}
                  className={[
                    'mb-1 flex w-full items-center justify-between gap-1 text-xs uppercase tracking-wide text-gray-400 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                    railCollapsed ? 'lg:hidden' : '',
                  ].join(' ')}
                >
                  <span className="truncate">{app.verbose_name}</span>
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {!isCollapsed && (
                  <ul className="space-y-1">
                    {app.models.map((model) => {
                      // Route by real_app_label — `app.app_label` may be a
                      // consumer `get_app_list` grouping (e.g. "financial_
                      // institutions") that does NOT round-trip through the
                      // list/detail endpoints (`resolve_model` resolves by
                      // the model's true `_meta.app_label`). Falls back to
                      // `app.app_label` for the default (ungrouped) case.
                      const routeApp = model.real_app_label || app.app_label;
                      const label = modelLabel(model);
                      const ModelIcon = iconForModel(model.model_name, label);
                      return (
                        <li key={`${routeApp}.${model.model_name}`}>
                          {/* NavLink highlights the current model — and stays
                          lit on its list, detail, edit, and add routes
                          (no `end`, so the path prefix matches). NavLink
                          sets aria-current="page" when active (#291). */}
                          <NavLink
                            to={`/${routeApp}/${model.model_name}`}
                            onClick={closeDrawer}
                            title={label}
                            aria-label={label}
                            className={({ isActive }) => navLinkClass(isActive, railCollapsed)}
                          >
                            <ModelIcon
                              className={railCollapsed ? 'h-4 w-4 shrink-0' : 'hidden'}
                              aria-hidden
                            />
                            <span className={railCollapsed ? 'lg:hidden' : ''}>{label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          {showFilter && visibleApps.length === 0 && (
            <div className="px-2 text-sm text-gray-500">No models match “{query}”.</div>
          )}
        </nav>
      </aside>
    </>
  );
}
