import type { Migration, Plan, Provider } from '@crossvisor/contracts';
import Link from 'next/link';
import { ButtonLink, Card, Empty, PageHeader, Progress, StatusBadge, Table, Td } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

export default async function DashboardPage() {
  const [providers, plans, migrations] = await Promise.all([
    api<Provider[]>('/providers'),
    api<Plan[]>('/plans'),
    api<Migration[]>('/migrations'),
  ]);
  const count = (s: Migration['status']) => migrations.filter((m) => m.status === s).length;
  const stats = [
    { label: 'Proveedores', value: providers.length },
    { label: 'Planes', value: plans.length },
    { label: 'En curso', value: count('running') + count('pending') },
    { label: 'Completadas', value: count('succeeded') },
    { label: 'Fallidas', value: count('failed') },
  ];

  const nextStep =
    !providers.some((p) => p.kind === 'xcpng') ? { href: '/providers/new', text: 'Conecta tu pool de XCP-ng' }
    : !providers.some((p) => p.kind === 'proxmox') ? { href: '/providers/new', text: 'Conecta tu Proxmox' }
    : !plans.length ? { href: '/plans/new', text: 'Crea tu primer plan de migración' }
    : null;

  return (
    <>
      <PageHeader title="Panel" subtitle="Estado general de las migraciones" />
      {nextStep && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 bg-accent/5">
          <p className="text-sm">Siguiente paso: <strong>{nextStep.text}</strong></p>
          <ButtonLink href={nextStep.href}>Empezar</ButtonLink>
        </Card>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-semibold">Migraciones recientes</h2>
      {migrations.length === 0 ? (
        <Empty>Aún no se ha ejecutado ninguna migración.</Empty>
      ) : (
        <Table head={['VM', 'Estado', 'Paso', 'Progreso', 'Inicio']}>
          {migrations.slice(0, 10).map((m) => (
            <tr key={m.id} className="hover:bg-line/20">
              <Td><Link href={`/migrations/${m.id}`} className="font-medium hover:text-accent">{m.vmName}</Link></Td>
              <Td><StatusBadge status={m.status} /></Td>
              <Td className="text-muted">{m.currentStep ?? '—'}</Td>
              <Td className="w-40"><Progress value={m.progress} /></Td>
              <Td className="text-muted">{dateTime(m.startedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
