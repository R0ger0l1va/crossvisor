import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

const TIMEOUT_MS = 5 * 60_000;

/** Espera a que el qemu-guest-agent responda. No falla si no lo hace: solo avisa. */
export class VerifyStep implements Step {
  readonly name = 'verify' as const;

  async run(ctx: MigrationContext) {
    if (!ctx.planVm.startAfterMigration) return;
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (ctx.signal.aborted) return;
      if (await ctx.proxmox.pingGuestAgent(ctx.plan.targetNode, ctx.targetVmid)) {
        await ctx.log('qemu-guest-agent responde: el sistema arrancó correctamente');
        return;
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }
    await ctx.log(
      'El qemu-guest-agent no respondió en 5 min. Revisa la consola de la VM ' +
        '(puede que simplemente no esté instalado).',
      'warn',
    );
  }
}
