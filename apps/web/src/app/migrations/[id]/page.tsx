import type { Migration, MigrationLog, Plan } from '@crossvisor/contracts';
import Link from 'next/link';
import { MigrationLive } from '@/components/migration-live';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

export default async function MigrationPage({ params }: PageProps<'/migrations/[id]'>) {
  const { id } = await params;
  const [migration, logs] = await Promise.all([
    api<Migration>(`/migrations/${id}`),
    api<MigrationLog[]>(`/migrations/${id}/logs`),
  ]);
  const plan = await api<Plan>(`/plans/${migration.planId}`);
  // El navegador se conecta directamente a la API para el SSE.
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return (
    <>
      <PageHeader
        title={migration.vmName}
        subtitle={`UUID origen ${migration.sourceVmUuid}`}
        actions={<Link href={`/plans/${plan.id}`} className="text-sm text-muted hover:text-accent">← {plan.name}</Link>}
      />
      <MigrationLive apiUrl={publicApiUrl} initial={migration} initialLogs={logs} />
    </>
  );
}
