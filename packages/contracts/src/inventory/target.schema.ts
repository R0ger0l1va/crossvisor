import { z } from 'zod';

/** Inventario del DESTINO (Proxmox VE). */

export const targetNodeSchema = z.object({
  name: z.string(),
  online: z.boolean(),
  cpus: z.number(),
  memoryBytes: z.number(),
});
export type TargetNode = z.infer<typeof targetNodeSchema>;

export const targetStorageSchema = z.object({
  node: z.string(),
  name: z.string(),
  type: z.string(),
  /** Si acepta discos de VM (content incluye "images"). */
  supportsImages: z.boolean(),
  availableBytes: z.number(),
  totalBytes: z.number(),
});
export type TargetStorage = z.infer<typeof targetStorageSchema>;

export const targetBridgeSchema = z.object({
  node: z.string(),
  name: z.string(),
  vlanAware: z.boolean(),
});
export type TargetBridge = z.infer<typeof targetBridgeSchema>;

export const targetInventorySchema = z.object({
  nodes: z.array(targetNodeSchema),
  storages: z.array(targetStorageSchema),
  bridges: z.array(targetBridgeSchema),
});
export type TargetInventory = z.infer<typeof targetInventorySchema>;
