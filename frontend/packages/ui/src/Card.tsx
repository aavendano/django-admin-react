import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from './utils';

export interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Card({ title, actions, className, children }: PropsWithChildren<CardProps>) {
  return (
    <section className={cn('rounded-xl border border-base-300 bg-base-100 shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          {title ? <h2 className="text-base font-semibold leading-none tracking-tight text-base-content">{title}</h2> : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
