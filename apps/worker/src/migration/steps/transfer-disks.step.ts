import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { qm } from '../../tools/qm.js';
import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

/**
 * Copia cada disco XCP-ng → Proxmox:
 *   1. XAPI /export_raw_vdi?format=vhd  (solo bloques usados)  → fichero .vhd temporal
 *   2. `qm disk import` (qemu-img lee VHD nativamente)          → volumen en el storage destino
 *   3. Se conecta el volumen a la VM (scsiN o sataN)
 *
 * Mejora futura: streaming directo sin fichero temporal (como hace el
 * importador ESXi de Proxmox con FUSE), y lectura por NBD para warm.
 */
export class TransferDisksStep implements Step {
  readonly name = 'transfer_disks' as const;

  async run(ctx: MigrationContext) {
    const vm = ctx.sourceVm;
    const vmid = ctx.targetVmid;
    const node = ctx.plan.targetNode;
    const imported = { ...ctx.state.importedDisks };
    const bus = ctx.isWindows() ? 'sata' : 'scsi';
    const dir = join(ctx.scratchDir, ctx.migration.id);
    await mkdir(dir, { recursive: true });

    const totalBytes = vm.disks.reduce((s, d) => s + d.sizeBytes, 0) || 1;
    let doneBytes = vm.disks.filter((d) => imported[d.vdiUuid]).reduce((s, d) => s + d.sizeBytes, 0);

    for (const [i, disk] of vm.disks.entries()) {
      if (imported[disk.vdiUuid]) {
        await ctx.log(`Disco ${disk.name} ya importado, se omite`);
        continue;
      }
      const storage = ctx.plan.storageMap.find((m) => m.sourceSrUuid === disk.srUuid)!.targetStorage;
      const file = join(dir, `${disk.vdiUuid}.vhd`);

      // 1. Exportar desde XCP-ng con progreso aproximado (bytes recibidos / tamaño virtual).
      await ctx.log(`Exportando disco ${disk.name} (${(disk.sizeBytes / 2 ** 30).toFixed(1)} GiB)…`);
      const { stream, done } = await ctx.xcpng.exportDisk(disk.vdiUuid, 'vhd');
      let received = 0;
      let lastReport = 0;
      const meter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          received += chunk.length;
          const pct = ((doneBytes + Math.min(received, disk.sizeBytes)) / totalBytes) * 100;
          if (pct - lastReport >= 1) {
            lastReport = pct;
            void ctx.progress(pct);
          }
          cb(null, chunk);
        },
      });
      await pipeline(stream, meter, createWriteStream(file), { signal: ctx.signal });
      await done;

      // 2. Importar al storage de Proxmox.
      await ctx.log(`Importando ${disk.name} en ${storage}…`);
      const volume = await qm.diskImport(vmid, file, storage);

      // 3. Conectar el disco a la VM.
      const slot = `${bus}${i}`;
      await ctx.proxmox.updateVmConfig(node, vmid, {
        [slot]: `${volume}${bus === 'scsi' ? ',iothread=1,discard=on' : ',discard=on'}`,
        ...(disk.bootable || i === 0 ? { boot: `order=${slot}` } : {}),
      });
      await rm(file, { force: true });

      imported[disk.vdiUuid] = volume;
      doneBytes += disk.sizeBytes;
      await ctx.saveState({ importedDisks: imported });
      await ctx.log(`Disco ${disk.name} → ${slot} (${volume})`);
    }
    await rm(dir, { recursive: true, force: true });
  }
}
