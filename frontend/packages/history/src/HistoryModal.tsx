// Object-history timeline (#244) — Django admin's "History" view. Reads
// GET <app>/<model>/<pk>/history/ (LogEntry timeline) and renders the
// change log in the shared Modal. Opened from the detail page.

import { useEffect, useState } from 'react';

import { useApiClient, type HistoryResponse } from '@dar/data';
import { Modal, Spinner } from '@dar/ui';

const ACTION_DOT: Record<string, string> = {
  addition: 'bg-success',
  change: 'bg-info',
  deletion: 'bg-error',
};

export interface HistoryModalProps {
  appLabel: string;
  modelName: string;
  pk: string | number;
  onClose: () => void;
}

export function HistoryModal({ appLabel, modelName, pk, onClose }: HistoryModalProps) {
  const client = useApiClient();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    client
      .history(appLabel, modelName, pk)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load history.');
      });
    return () => {
      alive = false;
    };
  }, [client, appLabel, modelName, pk]);

  return (
    <Modal title="History" onClose={onClose}>
      {error ? (
        <p className="text-sm text-error">{error}</p>
      ) : !data ? (
        <Spinner label="Loading…" />
      ) : data.entries.length === 0 ? (
        <p className="text-sm text-base-content/60">No history recorded for this object yet.</p>
      ) : (
        <ol className="space-y-3">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-sm">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTION_DOT[entry.action] ?? 'bg-base-content/40'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-base-content">{entry.change_message_human || entry.action}</div>
                <div className="text-xs text-base-content/60">
                  {new Date(entry.action_time).toLocaleString()}
                  {entry.user ? ` · ${entry.user.label}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
