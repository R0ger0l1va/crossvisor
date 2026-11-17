import type { Provider, SourceInventory, TargetInventory } from '@crossvisor/contracts';
import { PlanWizard } from '@/components/plan-wizard';
import { Button, Card, Empty, Field, inputClass, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

/**
 * Paso 1 (sin ?source&target): elegir origen y destino.
 * Paso 2: con ambos inventarios cargados, el asistente cliente arma el plan.
 */
export default async function NewPlanPage({ searchParams }: PageProps<'/plans/new'>) {
  const { source, target } = await searchParams;
  const providers = (await api<Provider[]>('/providers')).filter((p) => p.status === 'ok');
  const sources = providers.filter((p) => p.kind === 'xcpng');
  const targets = providers.filter((p) => p.kind === 'proxmox');

  if (typeof source !== 'string' || typeof target !== 'string') {
    if (!sources.length || !targets.length) {
      return (
        <>
          <PageHeader title="Nuevo plan" />
          <Empty>Necesitas al menos un XCP-ng y un Proxmox conectados correctamente.</Empty>
        </>
      );
    }
    return (
      <div className="max-w-2xl">
        <PageHeader title="Nuevo plan" subtitle="1 / 2 · Origen y destino" />
        <Card>
          <form className="space-y-4">
            <Field label="Origen (XCP-ng)">
              <select name="source" className={inputClass}>{sources.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Field label="Destino (Proxmox)">
              <select name="target" className={inputClass}>{targets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Button type="submit">Siguiente</Button>
          </form>
        </Card>
      </div>
    );
  }

  const [sourceInv, targetInv] = await Promise.all([
    api<SourceInventory>(`/providers/${source}/inventory`),
    api<TargetInventory>(`/providers/${target}/inventory`),
  ]);
  return (
    <>
      <PageHeader title="Nuevo plan" subtitle="2 / 2 · VMs y mapeos" />
      <PlanWizard sourceProviderId={source} targetProviderId={target} source={sourceInv} target={targetInv} />
    </>
  );
}
