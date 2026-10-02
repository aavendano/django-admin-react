import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CustomPage, type CustomPageContext } from './CustomPage';

const page = { path: 'content/articles', label: 'Articles', group: 'Content', module: '/s/a.js' };

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderPage(importModule: (url: string) => Promise<unknown>) {
  return render(
    <MemoryRouter initialEntries={['/content/articles']}>
      <Routes>
        <Route
          path="content/articles"
          element={<CustomPage page={page} importModule={importModule} />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomPage', () => {
  it('imports the module and mounts it with a context', async () => {
    let received: CustomPageContext | undefined;
    const importModule = vi.fn(async () => ({
      mount(el: HTMLElement, ctx: CustomPageContext) {
        received = ctx;
        el.textContent = 'hello from module';
      },
    }));
    renderPage(importModule);
    expect(await screen.findByText('hello from module')).toBeTruthy();
    expect(importModule).toHaveBeenCalledWith('/s/a.js');
    expect(received?.page).toEqual(page);
    expect(received?.embedded).toBe(true);
    expect(['dark', 'light']).toContain(received?.theme());
  });

  it('lets the module navigate inside the SPA', async () => {
    let ctx: CustomPageContext | undefined;
    renderPage(async () => ({ mount: (_el: HTMLElement, c: CustomPageContext) => void (ctx = c) }));
    await waitFor(() => expect(ctx).toBeDefined());
    act(() => ctx?.navigate('auth/user'));
    expect((await screen.findByTestId('where')).textContent).toBe('/auth/user');
  });

  it('runs the cleanup on unmount', async () => {
    const cleanup = vi.fn();
    const { unmount } = renderPage(async () => ({ mount: () => cleanup }));
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('shows an error when the module is broken', async () => {
    renderPage(async () => ({}));
    expect((await screen.findByRole('alert')).textContent).toContain('does not export mount');
  });

  it('shows an error when the import fails', async () => {
    renderPage(async () => {
      throw new Error('404 Not Found');
    });
    expect((await screen.findByRole('alert')).textContent).toContain('404 Not Found');
  });
});
