import { z } from 'zod';

/**
 * Un PLAN agrupa VMs a migrar con sus mapeos (inspirado en Forklift/Konveyor:
 * Provider → NetworkMap/StorageMap → Plan → Migration).
 */

/**
 * cold: se apaga la VM, se copian los discos y se arranca en Proxmox.
 * warm: copia con la VM encendida usando CBT y luego un corte corto (fase futura).
 */
export const migrationModeSchema = z.enum(['cold', 'warm']);
export type MigrationMode = z.infer<typeof migrationModeSchema>;

export const networkMappingSchema = z.object({
  sourceNetworkUuid: z.string(),
  targetBridge: z.string(),
  vlanTag: z.number().int().min(1).max(4094).nullable().default(null),
});
export type NetworkMapping = z.infer<typeof networkMappingSchema>;

export const storageMappingSchema = z.object({
  sourceSrUuid: z.string(),
  targetStorage: z.string(),
});
export type StorageMapping = z.infer<typeof storageMappingSchema>;

export const planVmSchema = z.object({
  sourceVmUuid: z.string(),
  /** VMID en Proxmox; si se omite, se pide el siguiente libre. */
  targetVmid: z.number().int().min(100).nullable().default(null),
  startAfterMigration: z.boolean().default(true),
});
export type PlanVm = z.infer<typeof planVmSchema>;

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  sourceProviderId: z.uuid(),
  targetProviderId: z.uuid(),
  targetNode: z.string().min(1),
  mode: migrationModeSchema.default('cold'),
  networkMap: z.array(networkMappingSchema),
  storageMap: z.array(storageMappingSchema),
  vms: z.array(planVmSchema).min(1),
});
export type CreatePlanDto = z.infer<typeof createPlanSchema>;

export const planSchema = createPlanSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});
export type Plan = z.infer<typeof planSchema>;
