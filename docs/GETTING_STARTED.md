# Puesta en marcha

Guía paso a paso para levantar crossvisor en local y, después, preparar un entorno
donde se puedan migrar VMs de verdad.

## 1. Requisitos

| Herramienta | Versión | Comprobar |
|---|---|---|
| Node.js | ≥ 24 | `node -v` |
| pnpm | ≥ 10 | `pnpm -v` (si no lo tienes: `corepack enable`) |
| Docker + Docker Compose | cualquiera reciente | `docker compose version` |

> Si `docker compose` responde `unknown command`, falta el plugin de Compose.
> En Arch/CachyOS: `sudo pacman -S docker-compose`. Además, el servicio tiene que
> estar arrancado: `sudo systemctl enable --now docker`.

## 2. Configuración

```bash
cp .env.example .env
```

Genera la clave que cifra las credenciales de los hipervisores y pégala en `SECRETS_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ Si cambias `SECRETS_KEY` más adelante, las credenciales ya guardadas dejan de poder
> descifrarse y tendrás que volver a crear los proveedores.

El resto de valores por defecto sirven para desarrollo:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | PostgreSQL (datos + cola de trabajos) |
| `API_PORT` / `WEB_ORIGIN` | Puerto de la API y origen permitido por CORS |
| `NEXT_PUBLIC_API_URL` | URL de la API vista desde el navegador (progreso en vivo) |
| `WORKER_SCRATCH_DIR` | Carpeta temporal para los discos exportados |
| `WORKER_CONCURRENCY` | Migraciones simultáneas por worker |

## 3. Instalar, crear la base de datos y arrancar

```bash
pnpm install          # dependencias de todo el monorepo
pnpm db:up            # PostgreSQL en Docker (puerto 5432)
pnpm build            # compila los paquetes compartidos (packages/*)
pnpm db:migrate       # crea las tablas
pnpm dev              # arranca web, api y worker en modo watch
```

| Servicio | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 (prueba: `curl localhost:4000/health`) |
| Worker | sin puerto; en la consola verás `Esperando migraciones en la cola…` |

`pnpm build` hace falta la primera vez y siempre que cambies algo en `packages/*`
fuera de `pnpm dev`, porque las apps consumen la versión compilada de los paquetes.

## 4. Primer uso

El panel de inicio te va diciendo el siguiente paso:

1. **Proveedores → Añadir → XCP-ng**: URL del *pool master* (`https://IP`), usuario `root`
   y contraseña.
2. **Proveedores → Añadir → Proxmox**: URL (`https://IP:8006`) y un token de API.
   Para crearlo en Proxmox:
   - *Datacenter → Permissions → API Tokens → Add*
   - Usuario `root@pam`, Token ID `crossvisor`, **desmarca "Privilege Separation"**
   - Copia el secreto (solo se muestra una vez). El Token ID queda como `root@pam!crossvisor`.
3. Entra en cada proveedor: si el estado es *Conectado* verás su inventario.
4. **Planes → Nuevo plan**: elige origen y destino, marca las VMs y mapea redes y storage.
5. **Iniciar migración** y sigue el progreso en la página de cada VM.

> En local puedes usar todo menos el paso de copiar discos: ese paso necesita la CLI
> `qm`, que solo existe en un nodo Proxmox (ver sección 5).

## 5. Migraciones reales: el worker en un nodo Proxmox

La web y la API pueden vivir donde quieras. El **worker** tiene que correr en el nodo
Proxmox de destino, como `root`, porque importa los discos con `qm disk import`.

En el nodo Proxmox:

```bash
# Node.js ≥ 24 y pnpm instalados en el nodo
git clone <repo> /opt/crossvisor && cd /opt/crossvisor
pnpm install
pnpm --filter @crossvisor/worker... build   # el worker y sus paquetes

# .env con la MISMA SECRETS_KEY que la API y la DATABASE_URL del Postgres compartido
cp .env.example .env && nano .env

mkdir -p /var/tmp/crossvisor                 # WORKER_SCRATCH_DIR
node apps/worker/dist/main.js
```

Requisitos de red:

- El nodo llega a Postgres (puerto 5432) y a XCP-ng (443).
- `WORKER_SCRATCH_DIR` tiene espacio libre para el disco más grande que vayas a migrar.

## 6. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| La web muestra "Algo salió mal" | La API no está arrancada o `API_URL` / `NEXT_PUBLIC_API_URL` apuntan mal |
| `SECRETS_KEY no está definida` | Falta el `.env` en la raíz del repo |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres no está arrancado (`pnpm db:up`) |
| Proveedor en estado *Error* con `self-signed certificate` | Marca "Aceptar certificados autofirmados" |
| Proxmox: `Invalid UUID` / 401 | Token mal copiado, o "Privilege Separation" activada sin permisos |
| Migración falla en `transfer_disks` con `spawn qm ENOENT` | El worker no está corriendo en un nodo Proxmox |
| Windows arranca pero va lento | Disco SATA y red e1000 provisionales: instala los drivers VirtIO y cámbialos |

## 7. Comandos de referencia

```bash
pnpm dev | build | lint | test | typecheck   # todo el monorepo
pnpm db:generate                               # tras editar packages/db/src/schema
pnpm db:migrate                                # aplica migraciones pendientes
pnpm db:studio                                 # explorador visual de la BD
pnpm --filter @crossvisor/api dev              # solo una app
docker compose down                            # parar Postgres (los datos se conservan)
docker compose down -v                         # parar y BORRAR los datos
```
