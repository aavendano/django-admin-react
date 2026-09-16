export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
  countLabel?: string;
  className?: string;
}

function pageWindow(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const values: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) values.push('ellipsis');
  for (let value = start; value <= end; value += 1) values.push(value);
  if (end < totalPages - 1) values.push('ellipsis');
  values.push(totalPages);
  return values;
}

const CONTROL_CLASS =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-40';

export function Pagination({
  page,
  totalPages,
  onChange,
  countLabel,
  className = '',
}: PaginationProps) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const pages = pageWindow(page, Math.max(totalPages, 1));

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 ${className}`}
    >
      <span>
        {countLabel != null ? (
          <>
            {countLabel}
            <span aria-hidden className="px-2 text-gray-400">
              ·
            </span>
          </>
        ) : null}
        Page {page} of {totalPages}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${CONTROL_CLASS} hover:bg-gray-100`}
          disabled={prevDisabled}
          aria-label="Previous page"
          onClick={() => onChange(page - 1)}
        >
          <span aria-hidden>‹</span>
        </button>

        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden
              className="inline-flex h-9 min-w-9 items-center justify-center text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              className={`${CONTROL_CLASS} ${
                item === page
                  ? 'border border-gray-300 bg-gray-100 text-gray-900'
                  : 'hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className={`${CONTROL_CLASS} hover:bg-gray-100`}
          disabled={nextDisabled}
          aria-label="Next page"
          onClick={() => onChange(page + 1)}
        >
          <span aria-hidden>›</span>
        </button>
      </div>
    </nav>
  );
}
