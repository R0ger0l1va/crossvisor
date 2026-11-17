import { run } from './exec.js';

/**
 * Envoltorio de la CLI `qm` de Proxmox.
 * ⚠️ Requiere que el worker corra EN un nodo Proxmox como root (o vía SSH en el futuro):
 * la API REST no permite subir imágenes de disco arbitrarias a cualquier storage.
 *
 * `qm disk import` usa qemu-img por debajo y acepta VHD (formato "vpc") directamente,
 * así que el VHD exportado por XCP-ng se importa sin conversión previa.
 */
export const qm = {
  /** Importa un fichero de disco y lo deja como "unusedN" en la VM. Devuelve el volumen (ej. local-lvm:vm-105-disk-1). */
  async diskImport(vmid: number, file: string, storage: string): Promise<string> {
    const out = await run('qm', ['disk', 'import', String(vmid), file, storage]);
    const match = out.match(/unused\d+:([^\s']+)/) ?? out.match(/successfully imported disk '([^']+)'/i);
    if (!match?.[1]) throw new Error(`No se pudo leer el volumen importado de la salida de qm:\n${out}`);
    return match[1];
  },
};
