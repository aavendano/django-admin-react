// Custom change-view plugin protocol.
//
// Lets a consumer ship a JS module that replaces the stock change
// form for a ModelAdmin that declares `react_change_view` (rest-api
// 1.9.0+). The registry / form-spec wire the opaque key; this module
// is the SPA-side dispatcher.
//
// Pre-bootstrap-safe — same contract as `darFieldWidgets`. CMS (or
// any plugin) may assign BEFORE the SPA bundle exists:
//
//   window.darChangeViews = window.darChangeViews || {};
//   window.darChangeViews["content.document-editor"] = {
//     mount(element, context) { /* … */ },
//     unmount(element) { /* … */ },
//   };
//
// The SPA reads `window.darChangeViews` at render time. Script order
// versus the SPA bundle is NOT a contract. `registerDarChangeView`
// is optional, for registrations after boot.

export type ChangeViewContext = {
  appLabel: string;
  modelName: string;
  objectId: string;
  apiBaseUrl: string;
  csrfToken?: string;
  navigate: (path: string) => void;
};

export interface ChangeViewSpec {
  mount: (element: HTMLElement, context: ChangeViewContext) => void;
  unmount: (element: HTMLElement) => void;
}

const registry: Record<string, ChangeViewSpec> = {};

declare global {
  interface Window {
    darChangeViews?: Record<string, ChangeViewSpec>;
    registerDarChangeView?: typeof registerDarChangeView;
  }
}

function ensureGlobal(): Record<string, ChangeViewSpec> {
  if (typeof window === 'undefined') return {};
  window.darChangeViews = window.darChangeViews || {};
  return window.darChangeViews;
}

/**
 * Register a change view after SPA boot. Optional — the no-build path
 * assigns `window.darChangeViews[key]` directly and does not need this.
 */
export function registerDarChangeView(name: string, spec: ChangeViewSpec): void {
  registry[name] = spec;
  ensureGlobal()[name] = spec;
}

/**
 * Look up a change view. Module-level registrations win over the
 * window global on conflict (same as `lookupFieldWidget`).
 */
export function lookupChangeView(name: string): ChangeViewSpec | undefined {
  return registry[name] ?? ensureGlobal()[name];
}

/** Test-only: wipe the module-level registry between cases. */
export function _resetChangeViewRegistryForTests(): void {
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
}

if (typeof window !== 'undefined') {
  ensureGlobal();
  window.registerDarChangeView = registerDarChangeView;
}
