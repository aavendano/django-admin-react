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
        <label htmlFor={inputId} className="text-sm font-medium leading-none text-base-content/80">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'flex h-10 w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content shadow-sm transition-colors',
          'placeholder:text-base-content/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-error focus-visible:ring-error' : '',
          className,
        )}
        {...rest}
      />
      {helpText && !error ? <span className="text-xs text-base-content/60">{helpText}</span> : null}
      {error ? <span className="text-xs font-medium text-error">{error}</span> : null}
    </div>
  );
}
