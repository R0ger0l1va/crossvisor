import { z } from 'zod';

/** Inventario del ORIGEN (XCP-ng), normalizado para no depender de la XAPI. */

export const sourceDiskSchema = z.object({
  vdiUuid: z.string(),
  name: z.string(),
  sizeBytes: z.number(),
  /** Posición del disco en la VM (userdevice de XAPI: "0", "1", ...). */
  position: z.string(),
  bootable: z.boolean(),
  srUuid: z.string(),
});

export const sourceNicSchema = z.object({
  vifUuid: z.string(),
  device: z.string(),
  mac: z.string(),
  networkUuid: z.string(),
});

export const sourceVmSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  description: z.string(),
  powerState: z.enum(['Running', 'Halted', 'Suspended', 'Paused']),
  vcpus: z.number(),
  memoryBytes: z.number(),
  firmware: z.enum(['bios', 'uefi']),
  secureBoot: z.boolean(),
  /** Nombre del SO reportado por las guest tools, si están instaladas. */
  osName: z.string().nullable(),
  /** true si detectamos PV drivers / guest tools de Xen (habrá que quitarlos). */
  hasXenTools: z.boolean(),
  disks: z.array(sourceDiskSchema),
  nics: z.array(sourceNicSchema),
});
export type SourceVm = z.infer<typeof sourceVmSchema>;
export type SourceDisk = z.infer<typeof sourceDiskSchema>;
export type SourceNic = z.infer<typeof sourceNicSchema>;

export const sourceNetworkSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  /** VLAN del PIF asociado, si la hay. */
  vlan: z.number().nullable(),
});
export type SourceNetwork = z.infer<typeof sourceNetworkSchema>;

export const sourceStorageSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: z.string(),
  sizeBytes: z.number(),
  usedBytes: z.number(),
});
export type SourceStorage = z.infer<typeof sourceStorageSchema>;

export const sourceInventorySchema = z.object({
  vms: z.array(sourceVmSchema),
  networks: z.array(sourceNetworkSchema),
  storages: z.array(sourceStorageSchema),
});
export type SourceInventory = z.infer<typeof sourceInventorySchema>;
