import type {
  SourceDisk,
  SourceInventory,
  SourceNetwork,
  SourceNic,
  SourceStorage,
  SourceVm,
} from '@crossvisor/contracts';
import type { Readable } from 'node:stream';
import { createClient, type Xapi, type XapiRecord } from 'xen-api';
import type {
  XapiGuestMetrics,
  XapiNetwork,
  XapiPif,
  XapiSr,
  XapiVbd,
  XapiVdi,
  XapiVif,
  XapiVm,
} from './types/records.js';

export interface XcpngConnection {
  url: string;
  username: string;
  password: string;
  insecureTls?: boolean;
}

const NULL_REF = 'OpaqueRef:NULL';
const num = (v: string | number | undefined) => Number(v ?? 0);

/**
 * Fachada sobre XAPI. Encapsula `xen-api` para que el resto de la app trabaje
 * con tipos normalizados de @crossvisor/contracts y no con objetos XAPI.
 *
 * Referencias:
 *  - XAPI: https://xapi-project.github.io/xen-api/
 *  - Exportación de discos: https://xapi-project.github.io/xen-api/snapshots.html
 *  - Uso real en XO: xen-orchestra/@xen-orchestra/xapi (vm.mjs, vdi.mjs)
 */
export class XcpngClient {
  private readonly xapi: Xapi;

  constructor(conn: XcpngConnection, opts: { readOnly?: boolean } = {}) {
    this.xapi = createClient({
      url: conn.url,
      auth: { user: conn.username, password: conn.password },
      allowUnauthorized: conn.insecureTls ?? false,
      readOnly: opts.readOnly ?? false,
      watchEvents: false,
    });
  }

  async connect(): Promise<void> {
    await this.xapi.connect();
  }

  async disconnect(): Promise<void> {
    await this.xapi.disconnect();
  }

  /** Abre y cierra una sesión: sirve para el botón "Probar conexión". */
  static async test(conn: XcpngConnection): Promise<void> {
    const client = new XcpngClient(conn, { readOnly: true });
    try {
      await client.connect();
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------- inventario

  async getInventory(): Promise<SourceInventory> {
    const [vms, vbds, vdis, vifs, networks, pifs, srs, metrics] = await Promise.all([
      this.xapi.getAllRecords<XapiVm>('VM'),
      this.xapi.getAllRecords<XapiVbd>('VBD'),
      this.xapi.getAllRecords<XapiVdi>('VDI'),
      this.xapi.getAllRecords<XapiVif>('VIF'),
      this.xapi.getAllRecords<XapiNetwork>('network'),
      this.xapi.getAllRecords<XapiPif>('PIF'),
      this.xapi.getAllRecords<XapiSr>('SR'),
      this.xapi.getAllRecords<XapiGuestMetrics>('VM_guest_metrics'),
    ]);

    const byRef = <T>(records: XapiRecord<T>[]) => new Map(records.map((r) => [r.$ref, r]));
    const idx = {
      vbd: byRef(vbds),
      vdi: byRef(vdis),
      vif: byRef(vifs),
      net: byRef(networks),
      pif: byRef(pifs),
      sr: byRef(srs),
      gm: byRef(metrics),
    };

    const sourceVms: SourceVm[] = vms
      .filter((vm) => !vm.is_a_template && !vm.is_a_snapshot && !vm.is_control_domain)
      .map((vm) => {
        const gm = idx.gm.get(vm.guest_metrics);
        const disks: SourceDisk[] = vm.VBDs.map((ref) => idx.vbd.get(ref))
          .filter((vbd): vbd is XapiRecord<XapiVbd> => vbd?.type === 'Disk' && vbd.VDI !== NULL_REF)
          .flatMap((vbd) => {
            const vdi = idx.vdi.get(vbd.VDI);
            if (!vdi) return [];
            return [
              {
                vdiUuid: vdi.uuid,
                name: vdi.name_label,
                sizeBytes: num(vdi.virtual_size),
                position: vbd.userdevice,
                bootable: vbd.bootable,
                srUuid: idx.sr.get(vdi.SR)?.uuid ?? '',
              },
            ];
          })
          .sort((a, b) => Number(a.position) - Number(b.position));

        const nics: SourceNic[] = vm.VIFs.map((ref) => idx.vif.get(ref))
          .filter((vif): vif is XapiRecord<XapiVif> => vif !== undefined)
          .map((vif) => ({
            vifUuid: vif.uuid,
            device: vif.device,
            mac: vif.MAC,
            networkUuid: idx.net.get(vif.network)?.uuid ?? '',
          }))
          .sort((a, b) => Number(a.device) - Number(b.device));

        return {
          uuid: vm.uuid,
          name: vm.name_label,
          description: vm.name_description,
          powerState: vm.power_state,
          vcpus: num(vm.VCPUs_max),
          memoryBytes: num(vm.memory_static_max),
          firmware: vm.HVM_boot_params?.firmware === 'uefi' ? 'uefi' : 'bios',
          secureBoot: vm.platform?.secureboot === 'true',
          osName: gm?.os_version?.name ?? null,
          hasXenTools: Boolean(gm?.PV_drivers_detected || gm?.PV_drivers_version?.major),
          disks,
          nics,
        };
      });

    const sourceNetworks: SourceNetwork[] = networks.map((n) => {
      const vlan = n.PIFs.map((ref) => num(idx.pif.get(ref)?.VLAN)).find((v) => v > 0);
      return { uuid: n.uuid, name: n.name_label, vlan: vlan ?? null };
    });

    const sourceStorages: SourceStorage[] = srs
      .filter((sr) => sr.content_type !== 'iso' && sr.type !== 'udev')
      .map((sr) => ({
        uuid: sr.uuid,
        name: sr.name_label,
        type: sr.type,
        sizeBytes: num(sr.physical_size),
        usedBytes: num(sr.physical_utilisation),
      }));

    return { vms: sourceVms, networks: sourceNetworks, storages: sourceStorages };
  }

  async getVm(uuid: string): Promise<SourceVm> {
    // Versión simple: reutiliza el inventario. Optimizable con get_record por refs.
    const { vms } = await this.getInventory();
    const vm = vms.find((v) => v.uuid === uuid);
    if (!vm) throw new Error(`VM ${uuid} no encontrada en XCP-ng`);
    return vm;
  }

  // ---------------------------------------------------------------- operaciones

  async shutdownVm(uuid: string, opts: { force?: boolean } = {}): Promise<void> {
    const vm = await this.xapi.getRecordByUuid<XapiVm>('VM', uuid);
    if (vm.power_state === 'Halted') return;
    await this.xapi.callAsync(opts.force ? 'VM.hard_shutdown' : 'VM.clean_shutdown', vm.$ref);
  }

  /**
   * Descarga un disco como stream (HTTP GET /export_raw_vdi en el host).
   *  - format "raw": imagen plana (incluye ceros; útil para escribir directo a un bloque).
   *  - format "vhd": solo bloques asignados (más rápido en discos poco llenos).
   */
  async exportDisk(
    vdiUuid: string,
    format: 'raw' | 'vhd' = 'vhd',
  ): Promise<{ stream: Readable; sizeBytes: number; done: Promise<unknown> }> {
    const vdi = await this.xapi.getRecordByUuid<XapiVdi>('VDI', vdiUuid);
    const res = await this.xapi.getResource('/export_raw_vdi/', {
      query: { vdi: vdi.$ref, format },
      task: true,
    });
    return {
      stream: res.body,
      sizeBytes: num(vdi.virtual_size),
      done: res.task ?? Promise.resolve(),
    };
  }

  // TODO(warm): VDI.enable_cbt, VM.snapshot, VDI.list_changed_blocks y lectura por
  // NBD (@vates/nbd-client) para migración en caliente. Ver xen-orchestra/@xen-orchestra/backups.
}
