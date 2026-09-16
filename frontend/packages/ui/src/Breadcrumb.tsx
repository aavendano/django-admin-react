import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  renderLink?: (to: string, className: string, label: ReactNode) => ReactNode;
}

const LINK_CLASS =
  'transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm';

function Separator() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-gray-400"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function Breadcrumb({ items, renderLink }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1.5 break-words sm:gap-2.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          const linked = item.to !== undefined && !last;
          return (
            <li key={i} className="inline-flex items-center gap-1.5 sm:gap-2.5">
              {i > 0 ? <Separator /> : null}
              {linked ? (
                renderLink ? (
                  renderLink(item.to as string, LINK_CLASS, item.label)
                ) : (
                  <a href={item.to} className={LINK_CLASS}>
                    {item.label}
                  </a>
                )
              ) : (
                <span
                  className={last ? 'font-normal text-gray-900' : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
