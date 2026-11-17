import type { Plan, Provider } from '@crossvisor/contracts';
import Link from 'next/link';
import { Badge, ButtonLink, Empty, PageHeader, Table, Td } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

export default async function PlansPage() {
  const [plans, providers] = await Promise.all([api<Plan[]>('/plans'), api<Provider[]>('/providers')]);
  const name = (id: string) => providers.find((p) => p.id === id)?.name ?? '—';
  return (
    <>
      <PageHeader
        title="Planes de migración"
        subtitle="Un plan agrupa VMs con sus mapeos de red y almacenamiento."
        actions={<ButtonLink href="/plans/new">Nuevo plan</ButtonLink>}
      />
      {plans.length === 0 ? (
        <Empty>No hay planes todavía.</Empty>
      ) : (
        <Table head={['Plan', 'Origen → destino', 'VMs', 'Modo', 'Creado']}>
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-line/20">
              <Td><Link href={`/plans/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link></Td>
              <Td className="text-muted">{name(p.sourceProviderId)} → {name(p.targetProviderId)} / {p.targetNode}</Td>
              <Td>{p.vms.length}</Td>
              <Td><Badge>{p.mode === 'cold' ? 'En frío' : 'En caliente'}</Badge></Td>
              <Td className="text-muted">{dateTime(p.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
