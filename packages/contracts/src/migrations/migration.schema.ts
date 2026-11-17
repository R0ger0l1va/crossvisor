import { z } from 'zod';

/**
 * Pasos del pipeline de migración de UNA VM, en orden.
 * El worker los ejecuta uno a uno y guarda el progreso en la BD,
 * así una migración fallida puede reintentarse desde el paso que falló.
 */
export const MIGRATION_STEPS = [
  'precheck', //       validar espacio, mapeos, firmware, estado de la VM
  'prepare_source', // apagar la VM (cold) o snapshot + CBT (warm)
  'create_target', //  crear la VM vacía en Proxmox (CPU, RAM, NICs, firmware)
  'transfer_disks', // copiar cada VDI → volumen de Proxmox
  'adapt_guest', //    drivers VirtIO, quitar Xen tools (virt-v2v-in-place)
  'start_target', //   arrancar en Proxmox
  'verify', //         esperar al qemu-guest-agent / red
] as const;
export const migrationStepSchema = z.enum(MIGRATION_STEPS);
export type MigrationStep = z.infer<typeof migrationStepSchema>;

export const migrationStatusSchema = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
  'canceled',
]);
export type MigrationStatus = z.infer<typeof migrationStatusSchema>;

export const migrationSchema = z.object({
  id: z.uuid(),
  planId: z.uuid(),
  sourceVmUuid: z.string(),
  vmName: z.string(),
  status: migrationStatusSchema,
  currentStep: migrationStepSchema.nullable(),
  /** 0-100 del paso actual. */
  progress: z.number().min(0).max(100),
  targetVmid: z.number().nullable(),
  error: z.string().nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Migration = z.infer<typeof migrationSchema>;

export const migrationLogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type MigrationLogLevel = z.infer<typeof migrationLogLevelSchema>;

export const migrationLogSchema = z.object({
  id: z.number(),
  migrationId: z.uuid(),
  level: migrationLogLevelSchema,
  step: migrationStepSchema.nullable(),
  message: z.string(),
  createdAt: z.iso.datetime(),
});
export type MigrationLog = z.infer<typeof migrationLogSchema>;
