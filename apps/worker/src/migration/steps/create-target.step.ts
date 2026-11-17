import type { QemuCreateParams } from '@crossvisor/proxmox';
import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

/**
 * Crea la VM vacía en Proxmox con la misma "forma" que la original:
 * CPU, RAM, firmware, NICs (mismas MAC para no romper DHCP/licencias).
 * Los discos se añaden en el paso transfer_disks.
 */
export class CreateTargetStep implements Step {
  readonly name = 'create_target' as const;

  async run(ctx: MigrationContext) {
    if (ctx.state.targetVmid) {
      await ctx.log(`La VM destino ${ctx.state.targetVmid} ya existe (reanudando)`);
      return;
    }
    const vm = ctx.sourceVm;
    const node = ctx.plan.targetNode;
    const vmid = ctx.planVm.targetVmid ?? (await ctx.proxmox.nextVmid());
    const windows = ctx.isWindows();

    const params: QemuCreateParams = {
      vmid,
      name: sanitizeName(vm.name),
      description: `Migrada desde XCP-ng por crossvisor\nUUID origen: ${vm.uuid}\n${vm.description}`,
      memory: Math.round(vm.memoryBytes / 2 ** 20),
      sockets: 1,
      cores: vm.vcpus,
      cpu: 'x86-64-v2-AES',
      ostype: windows ? 'win11' : 'l26',
      scsihw: 'virtio-scsi-single',
      agent: 'enabled=1',
      machine: vm.firmware === 'uefi' ? 'q35' : 'pc',
      bios: vm.firmware === 'uefi' ? 'ovmf' : 'seabios',
    };

    if (vm.firmware === 'uefi') {
      const firstDiskSr = vm.disks[0]?.srUuid;
      const storage = ctx.plan.storageMap.find((m) => m.sourceSrUuid === firstDiskSr)?.targetStorage;
      params.efidisk0 = `${storage}:1,efitype=4m,pre-enrolled-keys=${vm.secureBoot ? 1 : 0}`;
    }

    vm.nics.forEach((nic, i) => {
      const map = ctx.plan.networkMap.find((m) => m.sourceNetworkUuid === nic.networkUuid)!;
      // Windows sin drivers VirtIO no ve tarjetas virtio → e1000 hasta adaptarlo.
      const model = windows ? 'e1000' : 'virtio';
      params[`net${i}`] = `${model}=${nic.mac},bridge=${map.targetBridge}${map.vlanTag ? `,tag=${map.vlanTag}` : ''}`;
    });

    await ctx.log(`Creando VM ${vmid} en ${node}…`);
    const upid = await ctx.proxmox.createVm(node, params);
    await ctx.proxmox.waitTask(node, upid);
    await ctx.saveState({ targetVmid: vmid });
    await ctx.log(`VM ${vmid} creada`);
  }
}

/** Proxmox solo acepta nombres DNS válidos. */
function sanitizeName(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 63) || 'migrated-vm'
  );
}
