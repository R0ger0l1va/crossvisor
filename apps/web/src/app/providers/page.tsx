import type { Provider } from '@crossvisor/contracts';
import Link from 'next/link';
import { Badge, ButtonLink, Empty, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

export default async function ProvidersPage() {
  const providers = await api<Provider[]>('/providers');
  return (
    <>
      <PageHeader
        title="Proveedores"
        subtitle="Conexiones a los pools de XCP-ng (origen) y clústeres Proxmox (destino)."
        actions={<ButtonLink href="/providers/new">Añadir proveedor</ButtonLink>}
      />
      {providers.length === 0 ? (
        <Empty>Aún no hay proveedores. Añade primero tu pool de XCP-ng y luego tu Proxmox.</Empty>
      ) : (
        <Table head={['Nombre', 'Tipo', 'URL', 'Estado', 'Última prueba']}>
          {providers.map((p) => (
            <tr key={p.id} className="hover:bg-line/20">
              <Td>
                <Link href={`/providers/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>
              </Td>
              <Td>{p.kind === 'xcpng' ? <Badge tone="blue">XCP-ng · origen</Badge> : <Badge tone="amber">Proxmox · destino</Badge>}</Td>
              <Td className="font-mono text-xs text-muted">{p.url}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="text-muted">{dateTime(p.lastCheckedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
