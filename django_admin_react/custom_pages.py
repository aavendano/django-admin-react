"""Consumer pages rendered inside the SPA shell (``CUSTOM_PAGES``).

A custom page is a sidebar entry plus a client-side route whose content is
an ES module provided by the consumer. The package only *hosts* it: it adds
no endpoint, no permission and no model knowledge. The module talks to the
consumer's own endpoints with the session cookie and ``X-CSRFToken``, exactly
like the rest of the SPA.

This module is shared by ``views`` (what the shell embeds for a request) and
``checks`` (configuration errors surfaced at startup).
"""

from __future__ import annotations

import re
from typing import Any

from django.http import HttpRequest
from django.templatetags.static import static

# Route under the SPA mount: lowercase slug segments, no leading/trailing
# slash, no ``..`` (the SPA joins it under the mount point).
PATH_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*(?:/[a-z0-9][a-z0-9_-]*)*$")

# First segments the package's own URLconf serves before the SPA catch-all.
RESERVED_FIRST_SEGMENTS = frozenset({"api", "login", "logout", "web.manifest", "sw.js"})

REQUIRED_KEYS = ("path", "label", "module")
ALLOWED_KEYS = frozenset({*REQUIRED_KEYS, "group", "permission"})


def entry_errors(entry: Any) -> list[str]:
    """Problems with one ``CUSTOM_PAGES`` entry (empty list = valid)."""
    if not isinstance(entry, dict):
        return ["entry must be a dict"]
    errors = [f"missing {key!r}" for key in REQUIRED_KEYS if not entry.get(key)]
    unknown = sorted(set(entry) - ALLOWED_KEYS)
    if unknown:
        errors.append("unknown key(s) " + ", ".join(repr(k) for k in unknown))
    path = entry.get("path")
    if isinstance(path, str) and path:
        if not PATH_RE.match(path):
            errors.append(f"path {path!r} must be lowercase slug segments like 'content/articles'")
        elif path.split("/", 1)[0] in RESERVED_FIRST_SEGMENTS:
            errors.append(f"path {path!r} collides with a route the package serves")
    module = entry.get("module")
    # Same-origin only: a bare static path or an absolute path. No schemes
    # (``https:``, ``javascript:``, ``data:``) and no protocol-relative
    # ``//host`` URLs.
    if isinstance(module, str) and (":" in module or module.startswith("//")):
        errors.append(f"module {module!r} must be a same-origin path, not a URL")
    for key in ("label", "group", "permission"):
        value = entry.get(key)
        if value is not None and not isinstance(value, str):
            errors.append(f"{key!r} must be a string")
    return errors


def configured_entries(raw: Any) -> list[dict[str, Any]]:
    """The valid entries of ``CUSTOM_PAGES`` (invalid ones are skipped;
    ``checks`` reports them)."""
    if not isinstance(raw, (list, tuple)):
        return []
    seen: set[str] = set()
    entries = []
    for entry in raw:
        if entry_errors(entry) or entry["path"] in seen:
            continue
        seen.add(entry["path"])
        entries.append(entry)
    return entries


def resolve_module_url(module: str) -> str:
    """Absolute paths are used verbatim; anything else is a static file
    (so ``ManifestStaticFilesStorage`` hashing keeps working)."""
    return module if module.startswith("/") else static(module)


def pages_for_request(request: HttpRequest, raw: Any) -> list[dict[str, str]]:
    """What the SPA shell embeds for this user: only pages they may see.

    Pages without ``permission`` are visible to every user who can open
    the SPA at all (staff). Nothing secret is exposed either way — the
    module still has to pass the consumer's own endpoint permissions.
    """
    user = getattr(request, "user", None)
    pages = []
    for entry in configured_entries(raw):
        permission = entry.get("permission")
        if permission and not (user is not None and user.has_perm(permission)):
            continue
        pages.append(
            {
                "path": entry["path"],
                "label": entry["label"],
                "group": entry.get("group") or "",
                "module": resolve_module_url(entry["module"]),
            }
        )
    return pages
