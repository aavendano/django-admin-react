import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { DetailResponse, FormSpecPayload } from '@dar/data';
import { _resetChangeViewRegistryForTests } from '@dar/ui';

let changeViewName: string | undefined;
let specState: { data: FormSpecPayload | null; loading: boolean; error: Error | null };
let detailState: DetailResponse;

function detail(): DetailResponse {
  return {
    app_label: 'content',
    model_name: 'contentindex',
    pk: 7,
    label: 'home',
    permissions: { view: true, add: true, change: true, delete: true },
    fieldsets: [{ title: null, fields: ['stable_id'] }],
    fields: { stable_id: { label: 'Stable id', value: 'abc', type: 'string' } },
    inlines: [],
    object_actions: [],
    custom_views: [],
    save_options: { show_save: true },
  } as unknown as DetailResponse;
}

vi.mock('@dar/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dar/data')>();
  return {
    ...actual,
    useApiClient: () => ({}),
    useDetail: () => ({ data: detailState, loading: false, error: null, refresh: async () => {} }),
    useFormSpec: () => specState,
  };
});

vi.mock('../useModelMeta', () => ({
  useModelMeta: () => ({ plural: 'Content indexes', changeViewName }),
}));

vi.mock('../toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  toastMessages: vi.fn(),
}));

const { DetailPage } = await import('./DetailPage');

beforeEach(() => {
  detailState = detail();
  changeViewName = 'content.document-editor';
  specState = {
    data: { renderer: 'custom-view', view: { name: 'content.document-editor' } },
    loading: false,
    error: null,
  };
});

afterEach(() => {
  _resetChangeViewRegistryForTests();
  delete window.darChangeViews;
});

function renderPage(entry = '/content/contentindex/7') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/:appLabel/:modelName/:pk" element={<DetailPage />} />
        <Route path="/:appLabel/:modelName/:pk/change" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DetailPage custom change view', () => {
  it('mounts the island without waiting for ?edit=1 and does not show stock fieldsets', async () => {
    const mount = vi.fn();
    const unmount = vi.fn();
    window.darChangeViews = {
      'content.document-editor': { mount, unmount },
    };
    renderPage('/content/contentindex/7');
    expect(screen.queryByText('Stable id')).toBeNull();
    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Content indexes' })).toBeInTheDocument();
    await waitFor(() => expect(mount).toHaveBeenCalled());
  });

  it('also mounts on the /change alias without ?edit=1', async () => {
    const mount = vi.fn();
    window.darChangeViews = {
      'content.document-editor': { mount, unmount: vi.fn() },
    };
    renderPage('/content/contentindex/7/change');
    await waitFor(() => expect(mount).toHaveBeenCalled());
  });

  it('shows empty state when the key is missing — no form-spec fallback', () => {
    renderPage();
    expect(screen.getByText('Change view not registered')).toBeInTheDocument();
    expect(screen.queryByText('Stable id')).toBeNull();
  });
});
