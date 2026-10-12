// JsonViewer (#576) — syntax-highlighted, collapsible JSON tree with a
// copy-the-original-string button. Mounts inside the detail page's
// existing field-value container, so it inherits the card padding +
// dark-mode tokens (no novel chrome).
//
// Default export so the consumer can `React.lazy(() => import('./JsonViewer'))`
// — anything that doesn't have a JSON field on screen does not pay the
// bundle weight.
//
// No runtime dependency: this is ~2 KB of recursive JSX. The recursion
// is bounded by the parsed structure itself, which the caller has
// already `JSON.parse`d successfully — JSON has no cycles so the tree
// is naturally finite.

import { useState, type ReactNode } from 'react';
import { Check, ChevronRight, Copy } from 'lucide-react';

interface JsonViewerProps {
  /** The raw JSON string — copied verbatim by the copy button so the
   *  operator never gets a re-formatted variant on the clipboard. */
  raw: string;
  /** The parsed value (call sites already `JSON.parse`d for detection;
   *  pass it back so we don't re-parse). */
  parsed: unknown;
}

export default function JsonViewer({ raw, parsed }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write can fail on iframes / non-secure contexts —
      // ignore silently rather than surfacing a toast for a paste op.
    }
  }

  return (
    <div className="relative w-full overflow-x-auto rounded border border-base-300 bg-base-200 p-3 font-mono text-xs leading-relaxed text-base-content">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy JSON"
        title={copied ? 'Copied' : 'Copy'}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded border border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      <Node value={parsed} depth={0} />
    </div>
  );
}

// One JSON value — primitive, object, or array — rendered with the right
// syntax-highlight class. Containers (object/array) carry a clickable
// toggle that collapses to `{…} N keys` or `[…] N items`.
function Node({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span className="text-purple-600">null</span>;
  if (typeof value === 'boolean')
    return (
      <span className="text-purple-600">{value ? 'true' : 'false'}</span>
    );
  if (typeof value === 'number')
    // Use text-primary (the variant with a `.dark` remap in
    // apps/web/src/index.css) so dark-mode coverage is automatic
    // — the JSX-side `dark:` variant alone is not what the
    // check-dark-mode-coverage.mjs lint accepts (#433).
    return <span className="text-primary">{String(value)}</span>;
  if (typeof value === 'string')
    return (
      <span className="text-success">
        "{escapeForDisplay(value)}"
      </span>
    );
  if (Array.isArray(value)) return <ArrayNode value={value} depth={depth} />;
  if (typeof value === 'object') return <ObjectNode value={value as Record<string, unknown>} depth={depth} />;
  // Unknown type (shouldn't happen after JSON.parse — but render safely).
  return <span className="text-base-content/60">{String(value)}</span>;
}

function ObjectNode({ value, depth }: { value: Record<string, unknown>; depth: number }) {
  const keys = Object.keys(value);
  // Top-level + the next level open by default; deeper levels start
  // collapsed so a 50 KB blob doesn't fill the viewport on first paint.
  const [open, setOpen] = useState(depth < 2);
  if (keys.length === 0) return <span className="text-base-content/60">{'{}'}</span>;
  return (
    <Block
      open={open}
      onToggle={() => setOpen((o) => !o)}
      collapsedLabel={`{…} ${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`}
      openBracket="{"
      closeBracket="}"
      depth={depth}
    >
      {keys.map((k, i) => (
        <div key={k} className="pl-4">
          <span className="text-rose-700">"{escapeForDisplay(k)}"</span>
          <span className="text-base-content/60">: </span>
          <Node value={value[k]} depth={depth + 1} />
          {i < keys.length - 1 ? <span className="text-base-content/60">,</span> : null}
        </div>
      ))}
    </Block>
  );
}

function ArrayNode({ value, depth }: { value: unknown[]; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  if (value.length === 0) return <span className="text-base-content/60">[]</span>;
  return (
    <Block
      open={open}
      onToggle={() => setOpen((o) => !o)}
      collapsedLabel={`[…] ${value.length} ${value.length === 1 ? 'item' : 'items'}`}
      openBracket="["
      closeBracket="]"
      depth={depth}
    >
      {value.map((v, i) => (
        <div key={i} className="pl-4">
          <Node value={v} depth={depth + 1} />
          {i < value.length - 1 ? <span className="text-base-content/60">,</span> : null}
        </div>
      ))}
    </Block>
  );
}

// Shared open/close-with-toggle scaffolding for objects + arrays.
function Block({
  open,
  onToggle,
  collapsedLabel,
  openBracket,
  closeBracket,
  depth,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  collapsedLabel: string;
  openBracket: string;
  closeBracket: string;
  depth: number;
  children: ReactNode;
}) {
  return (
    <span>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        // Aligns the chevron baseline with the bracket character.
        className="inline-flex items-center align-baseline text-base-content/60 hover:text-base-content"
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      <span className="text-base-content/60">{openBracket}</span>
      {open ? (
        <>
          {children}
          <div className={depth === 0 ? '' : 'pl-0'}>
            <span className="text-base-content/60">{closeBracket}</span>
          </div>
        </>
      ) : (
        <>
          <span className="px-1 text-base-content/60">{collapsedLabel}</span>
          <span className="text-base-content/60">{closeBracket}</span>
        </>
      )}
    </span>
  );
}

// JSON's stringification rules are strict — render the content as text
// (no inner markup) so a value like `<script>` stays inert.
function escapeForDisplay(s: string): string {
  // Show the string contents as-is; React already escapes < / > / & in
  // text children, so this is a no-op transform that exists as a
  // semantic marker — DO NOT switch to dangerouslySetInnerHTML here.
  return s;
}
