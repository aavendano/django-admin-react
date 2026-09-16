import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from './utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
}

export function Input({ label, helpText, error, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium leading-none text-gray-700">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors',
          'placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus-visible:ring-red-500' : '',
          className,
        )}
        {...rest}
      />
      {helpText && !error ? <span className="text-xs text-gray-500">{helpText}</span> : null}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </div>
  );
}
