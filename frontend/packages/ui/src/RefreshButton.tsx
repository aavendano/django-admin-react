import { cloneElement, isValidElement, useState, type ReactNode } from 'react';

import { Button } from './Button';

export interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  tooltip?: string;
  icon?: ReactNode;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  tooltip = 'Refresh',
  icon = null,
  className,
}: RefreshButtonProps) {
  const [pending, setPending] = useState(false);

  async function run(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await onRefresh();
    } finally {
      setPending(false);
    }
  }

  const renderedIcon =
    pending && isValidElement<{ className?: string }>(icon)
      ? cloneElement(icon, {
          className: `${icon.props.className ?? ''} animate-spin`.trim(),
        })
      : icon;

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={() => {
        void run();
      }}
      disabled={pending}
      title={tooltip}
      aria-label={tooltip}
      className={`h-9 w-9 shrink-0 p-0 ${className ?? ''}`}
    >
      {renderedIcon}
    </Button>
  );
}
