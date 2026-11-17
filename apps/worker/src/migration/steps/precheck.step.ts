import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

/** Valida que se puede migrar ANTES de tocar nada. */
export class PrecheckStep implements Step {
  readonly name = 'precheck' as const;

  async run(ctx: MigrationContext) {
    const vm = await ctx.xcpng.getVm(ctx.migration.sourceVmUuid);
    await ctx.saveState({ sourceVm: vm });
    await ctx.log(
      `VM "${vm.name}": ${vm.vcpus} vCPU, ${Math.round(vm.memoryBytes / 2 ** 20)} MiB, ` +
        `${vm.disks.length} disco(s), ${vm.nics.length} NIC(s), firmware ${vm.firmware}`,
    );

    const errors: string[] = [];

    // 1. Todas las redes y SRs usadas por la VM deben estar mapeadas.
    for (const nic of vm.nics) {
      if (!ctx.plan.networkMap.some((m) => m.sourceNetworkUuid === nic.networkUuid)) {
        errors.push(`La red ${nic.networkUuid} (NIC ${nic.device}) no está mapeada`);
      }
    }
    for (const disk of vm.disks) {
      if (!ctx.plan.storageMap.some((m) => m.sourceSrUuid === disk.srUuid)) {
        errors.push(`El SR ${disk.srUuid} (disco ${disk.name}) no está mapeado`);
      }
    }

    // 2. Espacio suficiente en cada storage de destino.
    const target = await ctx.proxmox.getInventory();
    const needed = new Map<string, number>();
    for (const disk of vm.disks) {
      const st = ctx.plan.storageMap.find((m) => m.sourceSrUuid === disk.srUuid)?.targetStorage;
      if (st) needed.set(st, (needed.get(st) ?? 0) + disk.sizeBytes);
    }
    for (const [storage, bytes] of needed) {
      const st = target.storages.find((s) => s.node === ctx.plan.targetNode && s.name === storage);
      if (!st) errors.push(`El storage "${storage}" no existe en el nodo ${ctx.plan.targetNode}`);
      else if (!st.supportsImages) errors.push(`El storage "${storage}" no admite discos de VM`);
      else if (st.availableBytes < bytes) {
        errors.push(`"${storage}" tiene ${gib(st.availableBytes)} libres y se necesitan ${gib(bytes)}`);
      }
    }

    // 3. Avisos (no bloquean).
    if (vm.hasXenTools) await ctx.log('Tiene Xen guest tools: conviene desinstalarlas tras migrar', 'warn');
    if (ctx.isWindows()) {
      await ctx.log('Windows: se usarán SATA/e1000 hasta instalar los drivers VirtIO', 'warn');
    }
    if (vm.secureBoot) await ctx.log('Secure Boot activo: se creará el efidisk con claves pre-cargadas', 'warn');
    if (ctx.plan.mode === 'warm') errors.push('La migración en caliente (warm) aún no está implementada');

    if (errors.length) throw new Error(`Precheck fallido:\n- ${errors.join('\n- ')}`);
    await ctx.log('Precheck OK');
  }
}

const gib = (b: number) => `${(b / 2 ** 30).toFixed(1)} GiB`;
