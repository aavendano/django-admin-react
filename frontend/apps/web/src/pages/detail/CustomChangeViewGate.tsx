import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApiClient, useFormSpec } from '@dar/data';
import { EmptyState } from '@dar/ui';

import { RecordSkeleton } from '../../components/RecordSkeleton';
import { CustomChangeViewHost } from './CustomChangeViewHost';

export interface CustomChangeViewGateProps {
  name: string;
  appLabel: string;
  modelName: string;
  objectId: string;
}

function readCsrfToken(): string | undefined {
  const prefix = 'csrftoken=';
  const hit = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : undefined;
}

function apiBaseUrl(): string {
  const raw = document.querySelector<HTMLMetaElement>('meta[name="dar-api-prefix"]')?.content?.trim();
  if (raw) return raw.endsWith('/') ? raw : `${raw}/`;
  return '/admin-react/api/v1/';
}

/**
 * Object gate: GET form-spec must succeed (and return custom-view)
 * before the island mounts. Registry `change_view.name` is discovery
 * only — it does not authorize this row.
 */
export function CustomChangeViewGate({
  name,
  appLabel,
  modelName,
  objectId,
}: CustomChangeViewGateProps): JSX.Element {
  const client = useApiClient();
  const navigate = useNavigate();
  const { data: spec, loading, error } = useFormSpec({
    client,
    appLabel,
    modelName,
    pk: objectId,
  });

  const context = useMemo(
    () => ({
      appLabel,
      modelName,
      objectId,
      apiBaseUrl: apiBaseUrl(),
      csrfToken: readCsrfToken(),
      navigate: (path: string) => navigate(path),
    }),
    [appLabel, modelName, objectId, navigate],
  );

  if (loading && !spec) return <RecordSkeleton />;
  if (error && !spec) {
    return <EmptyState title="Couldn't open this object" description={error.message} />;
  }
  if (!spec || spec.renderer !== 'custom-view') {
    return (
      <EmptyState
        title="Change view unavailable"
        description="The API did not authorize a custom change view for this object."
      />
    );
  }

  return <CustomChangeViewHost name={spec.view.name || name} context={context} />;
}
