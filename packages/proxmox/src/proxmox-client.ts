import type {
  TargetBridge,
  TargetInventory,
  TargetNode,
  TargetStorage,
} from '@crossvisor/contracts';
import proxmoxApi, { type Proxmox } from 'proxmox-api';
import { Agent, fetch as undiciFetch } from 'undici';

export interface ProxmoxConnection {
  /** https://pve1.lan:8006 */
  url: string;
  /** USER@REALM!TOKENID */
  tokenId: string;
  tokenSecret: string;
  insecureTls?: boolean;
}

/** Parámetros de POST /nodes/{node}/qemu (ver API viewer de Proxmox). */
export type QemuCreateParams = Record<string, string | number | boolean>;

/**
 * Fachada sobre la API REST de Proxmox VE usando `proxmox-api` (tipado 100%).
 *  - API viewer: https://pve.proxmox.com/pve-docs/api-viewer/
 *  - Inspiración para la importación: el asistente "Import" de PVE 8.2+ para ESXi
 *    (pve-storage: PVE/Storage/ESXiPlugin.pm y pve-esxi-import-tools).
 */
export class ProxmoxClient {
  readonly api: Proxmox.Api;

  constructor(conn: ProxmoxConnection) {
    const url = new URL(conn.url);
    // TLS por conexión (sin tocar NODE_TLS_REJECT_UNAUTHORIZED global).
    const dispatcher = new Agent({ connect: { rejectUnauthorized: !conn.insecureTls } });
    this.api = proxmoxApi({
      host: url.hostname,
      port: url.port ? Number(url.port) : 8006,
      schema: url.protocol === 'http:' ? 'http' : 'https',
      tokenID: conn.tokenId,
      tokenSecret: conn.tokenSecret,
      // proxmox-api tipa `fetch` con su propia versión de undici: casteamos.
      fetch: ((input: string | URL, init?: object) =>
        undiciFetch(input, { ...init, dispatcher })) as never,
    });
  }

  static async test(conn: ProxmoxConnection): Promise<void> {
    await new ProxmoxClient(conn).api.version.$get();
  }

  // ---------------------------------------------------------------- inventario

  async getInventory(): Promise<TargetInventory> {
    const nodesRaw = await this.api.nodes.$get();
    const nodes: TargetNode[] = nodesRaw.map((n) => ({
      name: n.node,
      online: n.status === 'online',
      cpus: n.maxcpu ?? 0,
      memoryBytes: n.maxmem ?? 0,
    }));

    const storages: TargetStorage[] = [];
    const bridges: TargetBridge[] = [];
    for (const node of nodes.filter((n) => n.online)) {
      const pveNode = this.api.nodes.$(node.name);
      const [st, nets] = await Promise.all([
        pveNode.storage.$get({ enabled: true }),
        pveNode.network.$get({ type: 'any_bridge' }),
      ]);
      for (const s of st) {
        storages.push({
          node: node.name,
          name: s.storage,
          type: s.type,
          supportsImages: (s.content ?? '').split(',').includes('images'),
          availableBytes: s.avail ?? 0,
          totalBytes: s.total ?? 0,
        });
      }
      for (const n of nets) {
        bridges.push({
          node: node.name,
          name: n.iface,
          vlanAware: Boolean((n as { bridge_vlan_aware?: number })['bridge_vlan_aware']),
        });
      }
    }
    return { nodes, storages, bridges };
  }

  // ---------------------------------------------------------------- VMs

  async nextVmid(): Promise<number> {
    return Number(await this.api.cluster.nextid.$get());
  }

  /** Crea una VM (sin discos de datos todavía). Devuelve el UPID de la tarea. */
  async createVm(node: string, params: QemuCreateParams): Promise<string> {
    return this.api.nodes.$(node).qemu.$post(params as never);
  }

  async updateVmConfig(node: string, vmid: number, params: QemuCreateParams): Promise<void> {
    await this.api.nodes.$(node).qemu.$(vmid).config.$put(params as never);
  }

  async startVm(node: string, vmid: number): Promise<string> {
    return this.api.nodes.$(node).qemu.$(vmid).status.start.$post();
  }

  async getVmConfig(node: string, vmid: number): Promise<Record<string, unknown>> {
    return (await this.api.nodes.$(node).qemu.$(vmid).config.$get()) as Record<string, unknown>;
  }

  /** true cuando el qemu-guest-agent responde dentro de la VM. */
  async pingGuestAgent(node: string, vmid: number): Promise<boolean> {
    try {
      await this.api.nodes.$(node).qemu.$(vmid).agent.ping.$post();
      return true;
    } catch {
      return false;
    }
  }

  /** Espera a que termine una tarea de Proxmox (UPID). */
  async waitTask(node: string, upid: string, { timeoutMs = 10 * 60_000, pollMs = 2_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const st = await this.api.nodes.$(node).tasks.$(upid).status.$get();
      if (st.status === 'stopped') {
        if (st.exitstatus !== 'OK') throw new Error(`Tarea ${upid} falló: ${st.exitstatus}`);
        return;
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error(`Timeout esperando la tarea ${upid}`);
  }
}
