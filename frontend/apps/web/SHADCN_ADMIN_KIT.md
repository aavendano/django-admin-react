# Shadcn Admin Kit integration

Django Admin React is adopting [marmelab/shadcn-admin-kit](https://github.com/marmelab/shadcn-admin-kit) as the upstream visual/admin component source while retaining the existing Django ModelAdmin metadata, REST API, authentication, permissions, and routing contracts.

## Registry

The Vite app is configured with `components.json` and the Marmelab registry:

```text
https://marmelab.com/shadcn-admin-kit/r/{name}.json
```

To sync the current admin block from the registry from `frontend/apps/web`:

```bash
pnpm admin-kit:sync
```

The registry generates admin components under `src/components/admin`, shadcn primitives under `src/components/ui`, and supporting hooks/lib files. The application-level `@/*` alias is configured in both TypeScript and Vite for those generated imports.

## Migration boundary

Do not replace the Django Admin React data and authorization architecture with React Admin semantics in one step. During migration:

- `django-admin-rest-api` remains the backend wire protocol.
- Existing `@dar/data` hooks remain authoritative until a dedicated `ra-core` DataProvider adapter is introduced and tested.
- Existing React Router v6 routes remain authoritative until a deliberate router migration is approved.
- `@dar/ui` preserves its public props while adopting shadcn/admin-kit visual conventions.
- Generated Marmelab components should be introduced behind adapters rather than imported directly throughout domain packages.

## Compatibility note

The current Marmelab repository uses Base UI, Tailwind CSS 4, React 19 in its demo application, `ra-core` 5.x, and React Router 7. Django Admin React currently uses React 18, Tailwind CSS 3, and React Router 6. The registry integration is therefore staged so the UI can migrate without forcing all runtime upgrades in one commit.

## License

Shadcn Admin Kit is distributed under the MIT License. Preserve upstream copyright and license notices when substantial portions of upstream source are copied into this repository.
