"""``CUSTOM_PAGES``: consumer pages hosted inside the SPA shell.

The package only embeds a permission-filtered list of pages (path, label,
group, module URL) into the shell; it adds no endpoint and no permission.
"""

from __future__ import annotations

import importlib
import json
import re
from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from django.test import Client
from django.test import override_settings

from django_admin_react import checks as dar_checks
from django_admin_react.custom_pages import entry_errors
from django_admin_react.custom_pages import resolve_module_url

ROOT_URL = "/admin-react/"

PAGES = [
    {
        "path": "content/articles",
        "label": "Articles",
        "group": "Content",
        "module": "content/editor.js",
    },
    {
        "path": "reports/sales",
        "label": "Sales",
        "module": "/assets/sales.js",
        "permission": "auth.view_user",
    },
]


@contextmanager
def dar_settings(**values: object) -> Iterator[None]:
    import django_admin_react.conf as dar_conf

    with override_settings(DJANGO_ADMIN_REACT=values):
        importlib.reload(dar_conf)
        try:
            yield
        finally:
            importlib.reload(dar_conf)
    importlib.reload(dar_conf)


def embedded_pages(client: Client) -> list[dict[str, str]] | None:
    body = client.get(ROOT_URL).content.decode("utf-8")
    match = re.search(
        r'<script id="dar-custom-pages" type="application/json">(.*?)</script>', body, re.S
    )
    return json.loads(match.group(1)) if match else None


@pytest.mark.django_db
def test_no_custom_pages_by_default(superuser_client: Client) -> None:
    assert embedded_pages(superuser_client) is None


@pytest.mark.django_db
def test_pages_are_embedded_and_modules_resolved(superuser_client: Client) -> None:
    with dar_settings(CUSTOM_PAGES=PAGES):
        pages = embedded_pages(superuser_client)
    assert pages == [
        {
            "path": "content/articles",
            "label": "Articles",
            "group": "Content",
            # Relative modules go through staticfiles (hash-safe).
            "module": "/static/content/editor.js",
        },
        {"path": "reports/sales", "label": "Sales", "group": "", "module": "/assets/sales.js"},
    ]


@pytest.mark.django_db
def test_pages_are_filtered_by_permission(staff_client: Client) -> None:
    with dar_settings(CUSTOM_PAGES=PAGES):
        pages = embedded_pages(staff_client)
    assert [p["path"] for p in pages or []] == ["content/articles"]


@pytest.mark.django_db
def test_invalid_entries_are_never_embedded(superuser_client: Client) -> None:
    bad = [
        {"path": "x", "label": "X", "module": "https://evil.example/x.js"},
        {"path": "../escape", "label": "X", "module": "x.js"},
        {"path": "api/x", "label": "X", "module": "x.js"},
        {"label": "no path", "module": "x.js"},
    ]
    with dar_settings(CUSTOM_PAGES=[*bad, PAGES[0], PAGES[0]]):
        pages = embedded_pages(superuser_client)
    assert [p["path"] for p in pages or []] == ["content/articles"]


@pytest.mark.parametrize(
    ("entry", "fragment"),
    [
        ("nope", "must be a dict"),
        ({"label": "L", "module": "m.js"}, "missing 'path'"),
        ({"path": "Bad Path", "label": "L", "module": "m.js"}, "lowercase slug"),
        ({"path": "a//b", "label": "L", "module": "m.js"}, "lowercase slug"),
        ({"path": "login", "label": "L", "module": "m.js"}, "collides"),
        ({"path": "a", "label": "L", "module": "javascript:alert(1)"}, "same-origin"),
        ({"path": "a", "label": "L", "module": "//cdn.example/m.js"}, "same-origin"),
        ({"path": "a", "label": "L", "module": "data:text/javascript,1"}, "same-origin"),
        ({"path": "a", "label": "L", "module": "m.js", "extra": 1}, "unknown key"),
        ({"path": "a", "label": 3, "module": "m.js"}, "'label' must be a string"),
    ],
)
def test_entry_validation(entry: object, fragment: str) -> None:
    assert any(fragment in error for error in entry_errors(entry))


def test_valid_entry_has_no_errors() -> None:
    assert entry_errors(PAGES[0]) == []
    assert resolve_module_url("/abs/m.js") == "/abs/m.js"


def test_system_check_reports_bad_entries_and_duplicates() -> None:
    with override_settings(
        DJANGO_ADMIN_REACT={"CUSTOM_PAGES": [PAGES[0], PAGES[0], {"path": "x"}]}
    ):
        findings = dar_checks._check_custom_pages()
    messages = " ".join(f.msg for f in findings)
    assert {f.id for f in findings} == {dar_checks.ID_CUSTOM_PAGES}
    assert "duplicate path 'content/articles'" in messages
    assert "missing 'label'" in messages


def test_system_check_rejects_non_list() -> None:
    with override_settings(DJANGO_ADMIN_REACT={"CUSTOM_PAGES": "content"}):
        assert [f.id for f in dar_checks._check_custom_pages()] == [dar_checks.ID_CUSTOM_PAGES]


def test_system_check_warns_when_shadowing_a_model_route() -> None:
    page = {"path": "auth/user", "label": "Users", "module": "m.js"}
    with override_settings(DJANGO_ADMIN_REACT={"CUSTOM_PAGES": [page]}):
        findings = dar_checks._check_custom_pages()
    assert [f.id for f in findings] == [dar_checks.ID_CUSTOM_PAGE_SHADOWS_MODEL]


def test_valid_config_passes_checks() -> None:
    with override_settings(DJANGO_ADMIN_REACT={"CUSTOM_PAGES": PAGES}):
        assert dar_checks._check_custom_pages() == []
