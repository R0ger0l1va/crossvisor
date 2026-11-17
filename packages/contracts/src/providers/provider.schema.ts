import { z } from 'zod';

/** Tipo de hipervisor que representa un proveedor. */
export const providerKindSchema = z.enum(['xcpng', 'proxmox']);
export type ProviderKind = z.infer<typeof providerKindSchema>;

const baseProvider = z.object({
  name: z.string().min(1).max(100),
  /** Ej.: https://xcp-pool-master.lan  |  https://pve1.lan:8006 */
  url: z.url(),
  /** Aceptar certificados autofirmados (lo habitual en laboratorios). */
  insecureTls: z.boolean().default(false),
});

/** XCP-ng: usuario y contraseña de XAPI (normalmente root del pool master). */
export const createXcpngProviderSchema = baseProvider.extend({
  kind: z.literal('xcpng'),
  username: z.string().min(1),
  password: z.string().min(1),
});

/** Proxmox: token de API (Datacenter → Permissions → API Tokens). */
export const createProxmoxProviderSchema = baseProvider.extend({
  kind: z.literal('proxmox'),
  /** Formato USER@REALM!TOKENID, ej.: root@pam!crossvisor */
  tokenId: z.string().regex(/.+@.+!.+/, 'Formato esperado: USER@REALM!TOKENID'),
  tokenSecret: z.guid(),
});

export const createProviderSchema = z.discriminatedUnion('kind', [
  createXcpngProviderSchema,
  createProxmoxProviderSchema,
]);
export type CreateProviderDto = z.infer<typeof createProviderSchema>;

export const providerStatusSchema = z.enum(['unknown', 'ok', 'error']);
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

/** Lo que la API devuelve: nunca incluye secretos. */
export const providerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: providerKindSchema,
  url: z.string(),
  insecureTls: z.boolean(),
  status: providerStatusSchema,
  statusMessage: z.string().nullable(),
  lastCheckedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Provider = z.infer<typeof providerSchema>;
