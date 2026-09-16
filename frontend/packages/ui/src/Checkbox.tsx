import type { InputHTMLAttributes } from 'react';

import { cn } from './utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Checkbox({ className, ...rest }: CheckboxProps) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 align-middle">
      <input
        type="checkbox"
        className={cn(
          'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white shadow-sm transition-colors',
          'checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      />
      <svg
        className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-white peer-checked:block"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path
          d="M2.5 6.5 5 9l4.5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
