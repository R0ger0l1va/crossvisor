import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

/**
 * Adaptar el sistema invitado al nuevo hipervisor.
 *
 * Hoy: solo deja instrucciones en el log.
 * Siguiente iteración: ejecutar `virt-v2v-in-place` (libguestfs) sobre los discos
 * importados para:
 *   - Windows: inyectar drivers VirtIO (virtio-win.iso), quitar Xen PV drivers.
 *   - Linux: regenerar initramfs con virtio, limpiar xe-guest-utilities,
 *            corregir /etc/fstab que use /dev/xvdX.
 * Referencia: https://libguestfs.org/virt-v2v-in-place.1.html
 */
export class AdaptGuestStep implements Step {
  readonly name = 'adapt_guest' as const;

  async run(ctx: MigrationContext) {
    if (ctx.isWindows()) {
      await ctx.log(
        'Pendiente manual (Windows): instalar virtio-win-guest-tools y desinstalar ' +
          '"XCP-ng Windows PV Tools"; luego cambiar discos a SCSI y red a VirtIO.',
        'warn',
      );
    } else {
      await ctx.log(
        'Recomendado (Linux): desinstalar xe-guest-utilities e instalar qemu-guest-agent. ' +
          'Si /etc/fstab usa /dev/xvdX, cambiarlo por UUID=.',
        'warn',
      );
    }
  }
}
