import type { Migration, Plan } from '@crossvisor/contracts';
import Link from 'next/link';
import { StartPlanButton } from '@/components/start-plan-button';
import { Card, Empty, PageHeader, Progress, StatusBadge, Table, Td } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

export default async function PlanPage({ params }: PageProps<'/plans/[id]'>) {
  const { id } = await params;
  const [plan, migrations] = await Promise.all([
    api<Plan>(`/plans/${id}`),
    api<Migration[]>(`/migrations?planId=${id}`),
  ]);
  const active = migrations.some((m) => m.status === 'pending' || m.status === 'running');

  return (
    <>
      <PageHeader
        title={plan.name}
        subtitle={`${plan.vms.length} VM(s) → nodo ${plan.targetNode} · migración ${plan.mode === 'cold' ? 'en frío' : 'en caliente'}`}
        actions={<StartPlanButton planId={id} disabled={active} />}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-medium">Mapeo de redes</h2>
          <ul className="space-y-1 font-mono text-xs">
            {plan.networkMap.map((m) => <li key={m.sourceNetworkUuid}>{m.sourceNetworkUuid.slice(0, 8)}… → {m.targetBridge}{m.vlanTag ? ` tag=${m.vlanTag}` : ''}</li>)}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">Mapeo de almacenamiento</h2>
          <ul className="space-y-1 font-mono text-xs">
            {plan.storageMap.map((m) => <li key={m.sourceSrUuid}>{m.sourceSrUuid.slice(0, 8)}… → {m.targetStorage}</li>)}
          </ul>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Ejecuciones</h2>
      {migrations.length === 0 ? (
        <Empty>Este plan aún no se ha ejecutado.</Empty>
      ) : (
        <Table head={['VM', 'Estado', 'Paso', 'Progreso', 'VMID', 'Inicio']}>
          {migrations.map((m) => (
            <tr key={m.id} className="hover:bg-line/20">
              <Td><Link href={`/migrations/${m.id}`} className="font-medium hover:text-accent">{m.vmName}</Link></Td>
              <Td><StatusBadge status={m.status} /></Td>
              <Td className="text-muted">{m.currentStep ?? '—'}</Td>
              <Td className="w-40"><Progress value={m.progress} /></Td>
              <Td>{m.targetVmid ?? '—'}</Td>
              <Td className="text-muted">{dateTime(m.startedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
