'use client';

import type { CreatePlanDto, SourceInventory, TargetInventory } from '@crossvisor/contracts';
import { useMemo, useState, useTransition } from 'react';
import { createPlan } from '@/actions/plans';
import { Button, Card, Field, inputClass, StatusBadge } from '@/components/ui';
import { bytes } from '@/lib/format';

interface Props {
  sourceProviderId: string;
  targetProviderId: string;
  source: SourceInventory;
  target: TargetInventory;
}

export function PlanWizard({ sourceProviderId, targetProviderId, source, target }: Props) {
  const onlineNodes = target.nodes.filter((n) => n.online);
  const [name, setName] = useState('');
  const [node, setNode] = useState(onlineNodes[0]?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [netMap, setNetMap] = useState<Record<string, { bridge: string; vlan: string }>>({});
  const [stMap, setStMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const bridges = target.bridges.filter((b) => b.node === node);
  const storages = target.storages.filter((s) => s.node === node && s.supportsImages);

  // Solo hay que mapear las redes/SRs que usan las VMs seleccionadas.
  const vms = source.vms.filter((vm) => selected.has(vm.uuid));
  const usedNetworks = useMemo(
    () => source.networks.filter((n) => vms.some((vm) => vm.nics.some((nic) => nic.networkUuid === n.uuid))),
    [source.networks, vms],
  );
  const usedSrs = useMemo(
    () => source.storages.filter((s) => vms.some((vm) => vm.disks.some((d) => d.srUuid === s.uuid))),
    [source.storages, vms],
  );

  const toggle = (uuid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });

  function submit() {
    setError(undefined);
    const dto: CreatePlanDto = {
      name,
      sourceProviderId,
      targetProviderId,
      targetNode: node,
      mode: 'cold',
      vms: vms.map((vm) => ({ sourceVmUuid: vm.uuid, targetVmid: null, startAfterMigration: true })),
      networkMap: usedNetworks.map((n) => ({
        sourceNetworkUuid: n.uuid,
        targetBridge: netMap[n.uuid]?.bridge ?? bridges[0]?.name ?? '',
        vlanTag: netMap[n.uuid]?.vlan ? Number(netMap[n.uuid]!.vlan) : (n.vlan ?? null),
      })),
      storageMap: usedSrs.map((s) => ({
        sourceSrUuid: s.uuid,
        targetStorage: stMap[s.uuid] ?? storages[0]?.name ?? '',
      })),
    };
    startTransition(async () => {
      const res = await createPlan(dto);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del plan">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ola 1 - servidores web" />
        </Field>
        <Field label="Nodo Proxmox de destino">
          <select value={node} onChange={(e) => setNode(e.target.value)} className={inputClass}>
            {onlineNodes.map((n) => <option key={n.name}>{n.name}</option>)}
          </select>
        </Field>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">1. Máquinas virtuales</h2>
        <ul className="divide-y divide-line">
          {source.vms.map((vm) => (
            <li key={vm.uuid}>
              <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                <input type="checkbox" checked={selected.has(vm.uuid)} onChange={() => toggle(vm.uuid)} />
                <span className="flex-1 font-medium">{vm.name}</span>
                <span className="hidden text-muted sm:inline">
                  {vm.vcpus} vCPU · {bytes(vm.memoryBytes)} · {vm.disks.length} disco(s)
                </span>
                <StatusBadge status={vm.powerState} />
              </label>
            </li>
          ))}
        </ul>
      </Card>

      {vms.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-medium">2. Redes</h2>
            <div className="space-y-3">
              {usedNetworks.map((n) => (
                <div key={n.uuid} className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <Field label={`${n.name}${n.vlan ? ` (VLAN ${n.vlan})` : ''} →`}>
                    <select
                      className={inputClass}
                      value={netMap[n.uuid]?.bridge ?? bridges[0]?.name}
                      onChange={(e) => setNetMap({ ...netMap, [n.uuid]: { vlan: netMap[n.uuid]?.vlan ?? String(n.vlan ?? ''), bridge: e.target.value } })}
                    >
                      {bridges.map((b) => <option key={b.name}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="VLAN">
                    <input
                      className={`${inputClass} w-20`}
                      inputMode="numeric"
                      value={netMap[n.uuid]?.vlan ?? String(n.vlan ?? '')}
                      onChange={(e) => setNetMap({ ...netMap, [n.uuid]: { bridge: netMap[n.uuid]?.bridge ?? bridges[0]?.name ?? '', vlan: e.target.value } })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">3. Almacenamiento</h2>
            <div className="space-y-3">
              {usedSrs.map((s) => (
                <Field key={s.uuid} label={`${s.name} (${s.type}) →`}>
                  <select className={inputClass} value={stMap[s.uuid] ?? storages[0]?.name} onChange={(e) => setStMap({ ...stMap, [s.uuid]: e.target.value })}>
                    {storages.map((st) => <option key={st.name} value={st.name}>{st.name} — {bytes(st.availableBytes)} libres</option>)}
                  </select>
                </Field>
              ))}
            </div>
          </Card>
        </div>
      )}

      {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button onClick={submit} disabled={pending || !name || vms.length === 0}>
        {pending ? 'Guardando…' : `Crear plan con ${vms.length} VM(s)`}
      </Button>
    </div>
  );
}
