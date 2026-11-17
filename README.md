# crossvisor

Herramienta web para migrar máquinas virtuales de **XCP-ng** a **Proxmox VE**.

Monorepo con **pnpm + Turborepo**:

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router, Server Actions) + Tailwind |
| Backend | NestJS 12 (API REST + worker de migraciones) |
| Base de datos | PostgreSQL + Drizzle ORM |
| Cola de trabajos | BullMQ **sobre PostgreSQL** (no hace falta Redis) |
| Validación | Zod, compartido entre web, api y worker |

## Estructura

```
crossvisor/
├── apps/
│   ├── web/        Next.js: la interfaz (proveedores, planes, progreso en vivo)
│   ├── api/        NestJS: API REST; guarda en BD y encola migraciones
│   └── worker/     NestJS: ejecuta las migraciones (se instala en un nodo Proxmox)
├── packages/
│   ├── contracts/  Esquemas Zod + tipos compartidos (el "contrato" entre apps)
│   ├── db/         Esquema Drizzle, migraciones SQL y cifrado de credenciales
│   ├── xcpng/      Cliente XCP-ng (XAPI) sobre `xen-api` de Xen Orchestra
│   ├── proxmox/    Cliente Proxmox VE sobre `proxmox-api`
│   └── tsconfig/   Configuración TypeScript base
├── docs/ARCHITECTURE.md
└── docker-compose.yml   PostgreSQL para desarrollo
```

Regla de dependencias: `apps/*` dependen de `packages/*`, nunca al revés, y
`apps/web` **solo** depende de `contracts` (habla con el backend por HTTP).

## Puesta en marcha (desarrollo)

Guía completa, incluido el despliegue del worker en Proxmox y la solución de problemas: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

Requisitos: Node ≥ 24, pnpm, Docker.

```bash
cp .env.example .env            # y rellena SECRETS_KEY (comando en el propio archivo)
pnpm install
pnpm db:up                      # levanta PostgreSQL
pnpm build                      # compila los paquetes compartidos
pnpm db:migrate                 # crea las tablas
pnpm dev                        # web :3000 · api :4000 · worker
```

Abre http://localhost:3000 y sigue el panel: conectar XCP-ng → conectar Proxmox → crear plan → iniciar.

> ⚠️ El worker usa la CLI `qm` de Proxmox para importar discos, así que las
> migraciones reales solo funcionan con el worker corriendo **en un nodo Proxmox**.
> En tu máquina de desarrollo puedes usar todo lo demás (UI, inventario, planes).

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Arranca todo en modo watch |
| `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm typecheck` | En todo el monorepo |
| `pnpm db:generate` | Genera una migración SQL tras cambiar `packages/db/src/schema` |
| `pnpm db:migrate` | Aplica las migraciones pendientes |
| `pnpm db:studio` | Explorador visual de la BD (Drizzle Studio) |
| `pnpm --filter @crossvisor/api <script>` | Ejecuta un script en una sola app |

Más detalle del diseño y de cómo funciona una migración: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
