import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado simétrico (AES-256-GCM) para las credenciales de los hipervisores.
 * La clave (32 bytes en base64) viene de SECRETS_KEY y la comparten api y worker.
 * Formato guardado: v1:<iv>:<tag>:<ciphertext>  (todo en base64)
 */
function loadKey(key = process.env.SECRETS_KEY): Buffer {
  if (!key) throw new Error('SECRETS_KEY no está definida');
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) throw new Error('SECRETS_KEY debe ser de 32 bytes en base64');
  return buf;
}

export function encryptSecret(plain: string, key?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', loadKey(key), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64'))).join(':');
}

export function decryptSecret(payload: string, key?: string): string {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Secreto con formato inválido');
  const decipher = createDecipheriv('aes-256-gcm', loadKey(key), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
