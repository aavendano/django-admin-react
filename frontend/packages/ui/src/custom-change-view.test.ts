import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  _resetChangeViewRegistryForTests,
  lookupChangeView,
  registerDarChangeView,
} from './custom-change-view';

afterEach(() => {
  _resetChangeViewRegistryForTests();
  delete window.darChangeViews;
});

describe('registerDarChangeView / lookupChangeView', () => {
  it('round-trips a registered view by name', () => {
    const spec = { mount: vi.fn(), unmount: vi.fn() };
    registerDarChangeView('content.document-editor', spec);
    expect(lookupChangeView('content.document-editor')).toBe(spec);
  });

  it('returns undefined when no registration matches', () => {
    expect(lookupChangeView('not.registered')).toBeUndefined();
  });
});

describe('window.darChangeViews fallback (pre-bootstrap path)', () => {
  it('reads from window.darChangeViews when the module registry is empty', () => {
    const spec = { mount: vi.fn(), unmount: vi.fn() };
    window.darChangeViews = { 'content.document-editor': spec };
    expect(lookupChangeView('content.document-editor')).toBe(spec);
  });

  it('module registry wins over the window global on conflict', () => {
    const moduleSpec = { mount: vi.fn(), unmount: vi.fn() };
    const globalSpec = { mount: vi.fn(), unmount: vi.fn() };
    window.darChangeViews = { 'content.document-editor': globalSpec };
    registerDarChangeView('content.document-editor', moduleSpec);
    expect(lookupChangeView('content.document-editor')).toBe(moduleSpec);
  });

  it('is robust when window.darChangeViews is undefined', () => {
    delete window.darChangeViews;
    expect(lookupChangeView('anything')).toBeUndefined();
  });
});
