/**
 * Subconjunto de campos de los objetos XAPI que usamos.
 * Documentación completa: https://xapi-project.github.io/xen-api/
 * (los números de XAPI llegan como string en XML-RPC).
 */
export interface XapiVm {
  uuid: string;
  name_label: string;
  name_description: string;
  power_state: 'Running' | 'Halted' | 'Suspended' | 'Paused';
  is_a_template: boolean;
  is_a_snapshot: boolean;
  is_control_domain: boolean;
  VCPUs_max: string | number;
  memory_static_max: string | number;
  HVM_boot_params: Record<string, string>;
  platform: Record<string, string>;
  guest_metrics: string;
  VBDs: string[];
  VIFs: string[];
}

export interface XapiVbd {
  type: 'Disk' | 'CD' | 'Floppy';
  userdevice: string;
  bootable: boolean;
  VDI: string;
}

export interface XapiVdi {
  uuid: string;
  name_label: string;
  virtual_size: string | number;
  SR: string;
  cbt_enabled?: boolean;
}

export interface XapiVif {
  uuid: string;
  device: string;
  MAC: string;
  network: string;
}

export interface XapiNetwork {
  uuid: string;
  name_label: string;
  PIFs: string[];
}

export interface XapiPif {
  VLAN: string | number;
}

export interface XapiSr {
  uuid: string;
  name_label: string;
  type: string;
  physical_size: string | number;
  physical_utilisation: string | number;
  content_type: string;
}

export interface XapiGuestMetrics {
  os_version: Record<string, string>;
  PV_drivers_detected?: boolean;
  PV_drivers_version?: Record<string, string>;
}
