# Arquitectura

## Glosario rápido (si vienes del desarrollo web)

| Término | Qué es |
|---|---|
| **Hipervisor** | El software que ejecuta máquinas virtuales (VMs). XCP-ng y Proxmox VE son dos hipervisores distintos. |
| **XAPI** | La API de XCP-ng (XML-RPC). La usa Xen Orchestra y la usamos nosotros con la librería `xen-api`. |
| **Pool** | Grupo de servidores XCP-ng gestionados juntos. Te conectas al *pool master*. |
| **VDI / SR** | En XCP-ng: un disco virtual (VDI) vive en un repositorio de almacenamiento (SR). |
| **VIF / Network** | Tarjeta de red virtual (VIF) conectada a una red de XCP-ng. |
| **Nodo / Storage / Bridge** | En Proxmox: un servidor (nodo), un almacén de discos (`local-lvm`, ZFS, Ceph…) y un puente de red (`vmbr0`). |
| **VMID** | Número que identifica una VM en Proxmox (100, 101…). |
| **VirtIO** | Drivers de disco/red de alto rendimiento de KVM/Proxmox. Windows no los trae: hay que instalarlos. |
| **Guest tools** | Agentes dentro de la VM (Xen tools en XCP-ng, `qemu-guest-agent` en Proxmox). |
| **Migración en frío / caliente** | En frío se apaga la VM durante la copia. En caliente se copia encendida y solo se para unos minutos al final. |

## Vista general

```
 Navegador
    │  HTTP (páginas) + SSE (progreso en vivo)
    ▼
 apps/web (Next.js) ── Server Components / Server Actions ──► apps/api (NestJS :4000)
                                                                │
                                         ┌──────────────────────┼─────────────────────┐
                                         ▼                      ▼                     ▼
                                   PostgreSQL            XCP-ng (XAPI)        Proxmox (REST)
                                  (datos + cola)          solo lectura          solo lectura
                                         ▲
                                         │ BullMQ: cola "migrations"
                                         ▼
                              apps/worker (NestJS, en un nodo Proxmox)
                                 │                         │
                                 ├── XAPI: apagar VM,      ├── REST: crear VM, arrancar
                                 │   exportar discos (VHD) └── CLI `qm disk import`
```

* La **API** nunca modifica los hipervisores: solo lee inventario y encola trabajos.
* El **worker** es el único que hace acciones (apagar, copiar, crear). Así se puede
  desplegar cerca de los discos y escalar o reiniciar por separado.
* **PostgreSQL** guarda los datos (schema `public`) y la cola de BullMQ (schema `bullmq`).

## Modelo de datos (`packages/db/src/schema`)

Inspirado en [Forklift / Konveyor](https://github.com/kubev2v/forklift), el migrador de VMware a KubeVirt:

```
providers ──< plans ──< migrations ──< migration_logs
 (XCP-ng o     (VMs +      (1 por VM:      (bitácora que la
  Proxmox)     mapeos)     estado, paso,    UI muestra en vivo)
                           progreso, state)
```

* `providers.secret_encrypted`: contraseña o token cifrado con AES-256-GCM (`SECRETS_KEY`).
* `migrations.state` (jsonb): lo que cada paso deja para los siguientes. Por ejemplo,
  el VMID creado y los discos ya importados. Permite **reanudar** tras un fallo.

## Pipeline de una migración (`apps/worker/src/migration/steps`)

| # | Paso | Qué hace | Estado |
|---|---|---|---|
| 1 | `precheck` | Lee la VM; valida mapeos de red y storage y el espacio libre; avisa de Windows, Secure Boot y Xen tools | ✅ |
| 2 | `prepare_source` | Apaga la VM en XCP-ng (clean y, si falla, forzado) | ✅ en frío · ⏳ en caliente |
| 3 | `create_target` | Crea la VM vacía en Proxmox: CPU, RAM, BIOS/UEFI y NICs con **las mismas MAC** | ✅ |
| 4 | `transfer_disks` | `/export_raw_vdi?format=vhd` → fichero temporal → `qm disk import` → conecta el disco | ✅ |
| 5 | `adapt_guest` | Hoy: instrucciones en el log. Siguiente: `virt-v2v-in-place` | ⏳ |
| 6 | `start_target` | Arranca la VM en Proxmox | ✅ |
| 7 | `verify` | Espera al `qemu-guest-agent` (avisa, no falla) | ✅ |

Cada paso es una clase que implementa `Step` y debe ser **idempotente**. El runner
(`migration-runner.service.ts`) guarda `current_step` antes de cada paso, comprueba
la cancelación cada 5 s y, si reintentas, empieza en el paso que falló.

La VM de origen **nunca se borra**. Para volver atrás basta con encenderla en XCP-ng.

### Por qué el worker va en un nodo Proxmox

La API REST de Proxmox no permite subir una imagen de disco a cualquier storage.
La herramienta oficial para eso es `qm disk import`, que usa `qemu-img` por debajo y
lee el formato VHD de XCP-ng sin conversión previa. El propio importador de ESXi de
Proxmox también se ejecuta en el nodo.

## Cómo añadir cosas

* **Un endpoint**: esquema Zod en `packages/contracts`, luego módulo, controlador y servicio en
  `apps/api/src/modules/<x>`. Valida con `@Body({ schema })`.
* **Una tabla**: edita `packages/db/src/schema`, ejecuta `pnpm db:generate` y después `pnpm db:migrate`.
* **Un paso del pipeline**: añade el nombre a `MIGRATION_STEPS` (contracts), crea la
  clase en `steps/` y regístrala en `steps/index.ts`. Un test comprueba que ambos órdenes coinciden.
* **Una página**: `apps/web/src/app/<ruta>/page.tsx`. Pide los datos con `api()` de `lib/api.ts`
  y haz las mutaciones con Server Actions en `src/actions`.

## Hoja de ruta

1. `adapt_guest` con `virt-v2v-in-place`: drivers VirtIO en Windows y limpieza de Xen tools.
2. Copia en streaming sin fichero temporal (XAPI → `qemu-img` → volumen).
3. Migración en caliente: `VDI.enable_cbt`, snapshots, `VDI.list_changed_blocks` y
   lectura por NBD (`@vates/nbd-client`), igual que los backups incrementales de Xen Orchestra.
4. Autenticación en la web (Auth.js) y roles.
5. Varios workers, uno por nodo Proxmox, con colas por nodo.

## Referencias

| Proyecto | Para qué lo usamos |
|---|---|
| [vatesfr/xen-orchestra](https://github.com/vatesfr/xen-orchestra) | `xen-api` (cliente XAPI), y como referencia de exportación de VDI, CBT y NBD (`@xen-orchestra/xapi`, `@xen-orchestra/backups`) |
| [UrielCh/proxmox-api](https://github.com/UrielCh/proxmox-api) | Cliente tipado de la API REST de Proxmox |
| [Proxmox VE API viewer](https://pve.proxmox.com/pve-docs/api-viewer/) | Parámetros de `POST /nodes/{node}/qemu` |
| [pve-esxi-import-tools](https://git.proxmox.com/?p=pve-esxi-import-tools.git) | Cómo importa Proxmox desde ESXi: la referencia para el streaming |
| [kubev2v/forklift](https://github.com/kubev2v/forklift) | Modelo de dominio: Provider → Mapping → Plan → Migration |
| [libguestfs virt-v2v](https://libguestfs.org/virt-v2v-in-place.1.html) | Adaptación del sistema invitado: drivers y limpieza |
| [XAPI docs](https://xapi-project.github.io/xen-api/) | Clases VM, VBD, VDI, VIF y el handler `/export_raw_vdi` |
