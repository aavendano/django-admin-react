import { cloneElement, isValidElement, useState, type ReactNode } from 'react';

import { Button } from './Button';

export interface ResetButtonProps {
  isDirty: boolean;
  onReset: () => Promise<void> | void;
  label?: string;
  disabledHint?: string;
  icon?: ReactNode;
  className?: string;
  title?: string;
  trailing?: ReactNode;
}

export function ResetButton({
  isDirty,
  onReset,
  label = 'Reset',
  disabledHint = 'Already at default',
  icon = null,
  className,
  title,
  trailing,
}: ResetButtonProps) {
  const [pending, setPending] = useState(false);
  const disabled = !isDirty || pending;

  async function run(): Promise<void> {
    if (disabled) return;
    setPending(true);
    try {
      await onReset();
    } finally {
      setPending(false);
    }
  }

  const tooltip = disabled && !pending ? disabledHint : title;
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
      disabled={disabled}
      title={tooltip}
      className={`h-9 px-3 ${className ?? ''}`}
    >
      {renderedIcon}
      <span>{pending ? `${label}…` : label}</span>
      {trailing}
    </Button>
  );
}
