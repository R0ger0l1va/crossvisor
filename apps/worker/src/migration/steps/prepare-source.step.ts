import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

/**
 * Migración en frío: apagar la VM de origen para que los discos sean consistentes.
 * La VM NO se borra: si algo falla, basta con volver a encenderla en XCP-ng.
 *
 * TODO(warm): VM.snapshot + VDI.enable_cbt para copiar con la VM encendida.
 */
export class PrepareSourceStep implements Step {
  readonly name = 'prepare_source' as const;

  async run(ctx: MigrationContext) {
    const vm = await ctx.xcpng.getVm(ctx.sourceVm.uuid);
    if (vm.powerState === 'Halted') {
      await ctx.log('La VM de origen ya está apagada');
      return;
    }
    await ctx.log('Apagando la VM de origen (clean shutdown)…');
    try {
      await ctx.xcpng.shutdownVm(vm.uuid);
    } catch (err) {
      await ctx.log(`Clean shutdown falló (${(err as Error).message}), forzando apagado`, 'warn');
      await ctx.xcpng.shutdownVm(vm.uuid, { force: true });
    }
    await ctx.log('VM de origen apagada');
  }
}
