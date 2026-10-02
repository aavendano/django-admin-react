// Consumer pages hosted inside the SPA shell (DJANGO_ADMIN_REACT
// ["CUSTOM_PAGES"]). The backend embeds the permission-filtered list as an
// inert JSON block (`<script type="application/json" id="dar-custom-pages">`);
// the sidebar renders an entry per page and the app adds a route that
// imports `module` and calls its `mount(element, context)`.

export interface CustomPage {
  /** Route under the SPA mount, e.g. "content/articles" (no slashes around). */
  path: string;
  label: string;
  /** Sidebar section; "" puts the page in the default "Pages" section. */
  group: string;
  /** Same-origin URL of an ES module exporting `mount(element, context)`. */
  module: string;
}

const SCRIPT_ID = 'dar-custom-pages';

function isCustomPage(value: unknown): value is CustomPage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.path === 'string' &&
    v.path !== '' &&
    typeof v.label === 'string' &&
    typeof v.module === 'string' &&
    (v.group === undefined || typeof v.group === 'string')
  );
}

/** Pages embedded by the server; [] when absent or malformed. */
export function readCustomPages(doc: Document = document): CustomPage[] {
  const el = doc.getElementById(SCRIPT_ID);
  if (!el?.textContent) return [];
  try {
    const parsed: unknown = JSON.parse(el.textContent);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomPage).map((p) => ({ ...p, group: p.group ?? '' }));
  } catch {
    return [];
  }
}

/** Pages grouped by section, preserving configuration order. */
export function groupCustomPages(pages: CustomPage[]): Array<[string, CustomPage[]]> {
  const groups = new Map<string, CustomPage[]>();
  for (const page of pages) {
    const key = page.group || 'Pages';
    groups.set(key, [...(groups.get(key) ?? []), page]);
  }
  return [...groups.entries()];
}
