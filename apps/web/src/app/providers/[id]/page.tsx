import type { Provider, SourceInventory, TargetInventory } from '@crossvisor/contracts';
import { Suspense } from 'react';
import { deleteProvider, testProvider } from '@/actions/providers';
import { Badge, Button, Card, PageHeader, Skeleton, StatusBadge, Table, Td } from '@/components/ui';
import { api } from '@/lib/api';
import { bytes } from '@/lib/format';

export default async function ProviderPage({ params }: PageProps<'/providers/[id]'>) {
  const { id } = await params;
  const provider = await api<Provider>(`/providers/${id}`);

  return (
    <>
      <PageHeader
        title={provider.name}
        subtitle={provider.url}
        actions={
          <>
            <form action={testProvider.bind(null, id)}><Button variant="secondary">Probar conexión</Button></form>
            <form action={deleteProvider.bind(null, id)}><Button variant="danger">Eliminar</Button></form>
          </>
        }
      />
      <div className="mb-6 flex items-center gap-3 text-sm">
        <StatusBadge status={provider.status} />
        {provider.statusMessage && <span className="text-red-600 dark:text-red-400">{provider.statusMessage}</span>}
      </div>
      {provider.status === 'ok' && (
        <Suspense fallback={<Skeleton />}>
          {provider.kind === 'xcpng' ? <SourceInventoryView id={id} /> : <TargetInventoryView id={id} />}
        </Suspense>
      )}
    </>
  );
}

async function SourceInventoryView({ id }: { id: string }) {
  const inv = await api<SourceInventory>(`/providers/${id}/inventory`);
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Máquinas virtuales ({inv.vms.length})</h2>
      <Table head={['Nombre', 'Estado', 'SO', 'vCPU', 'RAM', 'Discos', 'Firmware']}>
        {inv.vms.map((vm) => (
          <tr key={vm.uuid}>
            <Td className="font-medium">{vm.name}</Td>
            <Td><StatusBadge status={vm.powerState} /></Td>
            <Td className="text-muted">{vm.osName ?? '—'}</Td>
            <Td>{vm.vcpus}</Td>
            <Td>{bytes(vm.memoryBytes)}</Td>
            <Td>{vm.disks.map((d) => bytes(d.sizeBytes)).join(' + ') || '—'}</Td>
            <Td>{vm.firmware.toUpperCase()}{vm.hasXenTools && <> <Badge tone="amber">Xen tools</Badge></>}</Td>
          </tr>
        ))}
      </Table>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-medium">Redes</h3>
          <ul className="space-y-1 text-sm">{inv.networks.map((n) => <li key={n.uuid}>{n.name}{n.vlan ? ` · VLAN ${n.vlan}` : ''}</li>)}</ul>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium">Storage repositories</h3>
          <ul className="space-y-1 text-sm">{inv.storages.map((s) => <li key={s.uuid}>{s.name} <span className="text-muted">({s.type}, {bytes(s.sizeBytes - s.usedBytes)} libres)</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}

async function TargetInventoryView({ id }: { id: string }) {
  const inv = await api<TargetInventory>(`/providers/${id}/inventory`);
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Nodos</h2>
      <Table head={['Nodo', 'Estado', 'CPUs', 'RAM']}>
        {inv.nodes.map((n) => (
          <tr key={n.name}>
            <Td className="font-medium">{n.name}</Td>
            <Td><Badge tone={n.online ? 'green' : 'red'}>{n.online ? 'online' : 'offline'}</Badge></Td>
            <Td>{n.cpus}</Td>
            <Td>{bytes(n.memoryBytes)}</Td>
          </tr>
        ))}
      </Table>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-medium">Storages para discos</h3>
          <ul className="space-y-1 text-sm">{inv.storages.filter((s) => s.supportsImages).map((s) => <li key={`${s.node}/${s.name}`}>{s.node}/{s.name} <span className="text-muted">({s.type}, {bytes(s.availableBytes)} libres)</span></li>)}</ul>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium">Bridges de red</h3>
          <ul className="space-y-1 text-sm">{inv.bridges.map((b) => <li key={`${b.node}/${b.name}`}>{b.node}/{b.name}{b.vlanAware && <span className="text-muted"> · VLAN aware</span>}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
