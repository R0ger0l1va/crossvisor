'use client';

import { MIGRATION_STEPS, type Migration, type MigrationLog } from '@crossvisor/contracts';
import { useEffect, useState, useTransition } from 'react';
import { cancelMigration, retryMigration } from '@/actions/migrations';
import { Button, Card, Progress, StatusBadge } from '@/components/ui';

const STEP_LABEL: Record<(typeof MIGRATION_STEPS)[number], string> = {
  precheck: 'Comprobaciones',
  prepare_source: 'Preparar origen',
  create_target: 'Crear VM en Proxmox',
  transfer_disks: 'Copiar discos',
  adapt_guest: 'Adaptar invitado',
  start_target: 'Arrancar',
  verify: 'Verificar',
};

const LEVEL_COLOR = { debug: 'text-muted', info: '', warn: 'text-amber-600 dark:text-amber-400', error: 'text-red-600 dark:text-red-400' };

/** Se suscribe al SSE de la API y pinta progreso + bitácora en vivo. */
export function MigrationLive({ apiUrl, initial, initialLogs }: { apiUrl: string; initial: Migration; initialLogs: MigrationLog[] }) {
  const [migration, setMigration] = useState(initial);
  const [logs, setLogs] = useState(initialLogs);
  const [pending, startTransition] = useTransition();
  const finished = ['succeeded', 'failed', 'canceled'].includes(migration.status);

  useEffect(() => {
    if (finished) return;
    const es = new EventSource(`${apiUrl}/migrations/${initial.id}/events`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as { migration: Migration; logs: MigrationLog[] };
      setMigration(data.migration);
      if (data.logs.length) {
        setLogs((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...data.logs.filter((l) => !seen.has(l.id))];
        });
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [apiUrl, initial.id, finished]);

  const currentIdx = migration.currentStep ? MIGRATION_STEPS.indexOf(migration.currentStep) : -1;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={migration.status} />
            {migration.targetVmid && <span className="text-sm text-muted">VMID Proxmox: {migration.targetVmid}</span>}
          </div>
          <div className="flex gap-2">
            {(migration.status === 'failed' || migration.status === 'canceled') && (
              <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => retryMigration(migration.id).then(() => location.reload()))}>
                Reintentar desde el paso fallido
              </Button>
            )}
            {!finished && (
              <Button variant="danger" disabled={pending} onClick={() => startTransition(() => cancelMigration(migration.id))}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-7">
          {MIGRATION_STEPS.map((step, i) => {
            const state =
              migration.status === 'succeeded' || i < currentIdx ? 'done'
              : i === currentIdx ? (migration.status === 'failed' ? 'failed' : 'current')
              : 'todo';
            return (
              <li key={step} className="space-y-1.5">
                <div className={`h-1.5 rounded-full ${state === 'done' ? 'bg-green-500' : state === 'current' ? 'bg-accent' : state === 'failed' ? 'bg-red-500' : 'bg-line'}`} />
                <p className={`text-xs ${state === 'todo' ? 'text-muted' : 'font-medium'}`}>{STEP_LABEL[step]}</p>
              </li>
            );
          })}
        </ol>

        {migration.status === 'running' && (
          <div className="space-y-1">
            <p className="text-sm">{migration.currentStep && STEP_LABEL[migration.currentStep]} · {migration.progress}%</p>
            <Progress value={migration.progress} />
          </div>
        )}
        {migration.error && <pre className="whitespace-pre-wrap rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{migration.error}</pre>}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Bitácora</h2>
        <div className="max-h-[28rem] overflow-y-auto rounded-md bg-bg p-3 font-mono text-xs leading-relaxed">
          {logs.length === 0 && <p className="text-muted">Esperando al worker…</p>}
          {logs.map((l) => (
            <p key={l.id} className={LEVEL_COLOR[l.level]}>
              <span className="text-muted">{new Date(l.createdAt).toLocaleTimeString('es')} </span>
              {l.step && <span className="text-muted">[{l.step}] </span>}
              <span className="whitespace-pre-wrap">{l.message}</span>
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
