import type { MigrationContext } from '../migration-context.js';
import type { Step } from './step.js';

export class StartTargetStep implements Step {
  readonly name = 'start_target' as const;

  async run(ctx: MigrationContext) {
    if (!ctx.planVm.startAfterMigration) {
      await ctx.log('Arranque automático desactivado en el plan');
      return;
    }
    const node = ctx.plan.targetNode;
    await ctx.log(`Arrancando VM ${ctx.targetVmid}…`);
    await ctx.proxmox.waitTask(node, await ctx.proxmox.startVm(node, ctx.targetVmid));
    await ctx.log('VM arrancada en Proxmox');
  }
}
