// Host for consumer pages (DJANGO_ADMIN_REACT["CUSTOM_PAGES"]).
//
// The page's content is an ES module served by the consumer (same origin,
// loaded with a native dynamic `import()` — no inline script, so a strict
// `script-src 'self'` CSP keeps working). The module exports
//
//     export function mount(element, context) { …; return cleanup? }
//
// and owns everything inside `element`. The SPA owns the chrome around it
// (sidebar, routing, auth). `cleanup` (or `{ unmount() }`) runs when the
// route changes away.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CustomPage as CustomPageConfig } from '@dar/sidebar';
import { t } from '@dar/ui';

export interface CustomPageContext {
  /** The page entry from CUSTOM_PAGES (path, label, group, module). */
  page: CustomPageConfig;
  /** SPA mount, e.g. "/admin-react/". */
  mountPoint: string;
  /** Client-side navigation within the SPA ("/auth/user", "content/x"). */
  navigate: (to: string) => void;
  /** Current Django CSRF token (send as `X-CSRFToken` on unsafe requests). */
  csrfToken: () => string;
  /** "dark" or "light", as currently applied to the shell. */
  theme: () => 'dark' | 'light';
  /** Always true here; lets a module adapt when it also runs standalone. */
  embedded: true;
}

type Cleanup = (() => void) | { unmount: () => void } | void | undefined;

export interface CustomPageModule {
  mount: (element: HTMLElement, context: CustomPageContext) => Cleanup | Promise<Cleanup>;
}

export type ModuleImporter = (url: string) => Promise<unknown>;

const nativeImport: ModuleImporter = (url) => import(/* @vite-ignore */ url);

function readMount(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="dar-mount"]')?.content || '/';
}

function readCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1] as string) : '';
}

function runCleanup(cleanup: Cleanup): void {
  if (typeof cleanup === 'function') cleanup();
  else if (cleanup && typeof cleanup.unmount === 'function') cleanup.unmount();
}

export function CustomPage({
  page,
  importModule = nativeImport,
}: {
  page: CustomPageConfig;
  importModule?: ModuleImporter;
}) {
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const element = container.current;
    if (!element) return undefined;
    let cancelled = false;
    let cleanup: Cleanup;
    setError(null);
    setLoading(true);
    importModule(page.module)
      .then(async (mod) => {
        if (cancelled) return;
        const mount = (mod as Partial<CustomPageModule> | null)?.mount;
        if (typeof mount !== 'function') {
          throw new Error(`${page.module} does not export mount(element, context)`);
        }
        cleanup = await mount(element, {
          page,
          mountPoint: readMount(),
          navigate: (to: string) => navigate(to.startsWith('/') ? to : `/${to}`),
          csrfToken: readCsrfToken,
          theme: () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
          embedded: true,
        });
        if (cancelled) runCleanup(cleanup);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      runCleanup(cleanup);
      element.replaceChildren();
    };
    // `navigate` is stable per router; re-mount only when the page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.path, page.module, importModule]);

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-gray-500">{t('Loading…')}</div>}
      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {page.label}: {error}
        </div>
      )}
      <div ref={container} data-custom-page={page.path} />
    </div>
  );
}
