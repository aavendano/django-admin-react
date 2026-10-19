// CustomChangeViewHost — mounts a consumer change-view island.
//
// Reads `window.darChangeViews` at render time (pre-bootstrap-safe).
// Missing key → empty state. Never falls back to the JSON form-spec.

import { useEffect, useRef } from 'react';

import { EmptyState, lookupChangeView, type ChangeViewContext } from '@dar/ui';

export interface CustomChangeViewHostProps {
  name: string;
  context: ChangeViewContext;
}

export function CustomChangeViewHost({ name, context }: CustomChangeViewHostProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const spec = lookupChangeView(name);

  useEffect(() => {
    const element = ref.current;
    const live = lookupChangeView(name);
    if (!element || !live) return undefined;
    live.mount(element, context);
    return () => {
      live.unmount(element);
      element.innerHTML = '';
    };
    // Mount once per key; context is captured at mount (navigate/csrf are stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (!spec) {
    return (
      <EmptyState
        title="Change view not registered"
        description={`No plugin is registered for “${name}”. The stock form is not shown.`}
      />
    );
  }

  return <div ref={ref} data-dar-change-view={name} className="min-h-[12rem]" />;
}
