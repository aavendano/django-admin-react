import { afterEach, describe, expect, it } from 'vitest';

import { groupCustomPages, readCustomPages } from './customPages';

function embed(content: string): void {
  const el = document.createElement('script');
  el.id = 'dar-custom-pages';
  el.type = 'application/json';
  el.textContent = content;
  document.body.append(el);
}

afterEach(() => {
  document.getElementById('dar-custom-pages')?.remove();
});

describe('readCustomPages', () => {
  it('returns [] when nothing is embedded', () => {
    expect(readCustomPages()).toEqual([]);
  });

  it('parses the embedded list', () => {
    embed(
      JSON.stringify([
        { path: 'content/articles', label: 'Articles', group: 'Content', module: '/s/a.js' },
        { path: 'reports', label: 'Reports', module: '/s/r.js' },
      ]),
    );
    expect(readCustomPages()).toEqual([
      { path: 'content/articles', label: 'Articles', group: 'Content', module: '/s/a.js' },
      { path: 'reports', label: 'Reports', group: '', module: '/s/r.js' },
    ]);
  });

  it('ignores malformed JSON and malformed entries', () => {
    embed('not json');
    expect(readCustomPages()).toEqual([]);
    document.getElementById('dar-custom-pages')?.remove();
    embed(JSON.stringify([{ path: '', label: 'x', module: 'm' }, { label: 'x' }, 'nope']));
    expect(readCustomPages()).toEqual([]);
  });
});

describe('groupCustomPages', () => {
  it('groups by section in configuration order', () => {
    const a = { path: 'a', label: 'A', group: 'Content', module: '/a.js' };
    const b = { path: 'b', label: 'B', group: '', module: '/b.js' };
    const c = { path: 'c', label: 'C', group: 'Content', module: '/c.js' };
    expect(groupCustomPages([a, b, c])).toEqual([
      ['Content', [a, c]],
      ['Pages', [b]],
    ]);
  });
});
