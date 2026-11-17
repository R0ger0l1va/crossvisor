import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/** Componentes de UI mínimos. Sustituibles por shadcn/ui cuando el proyecto crezca. */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-lg border border-line bg-surface p-5 ${className}`} {...props} />;
}

const buttonStyles = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'border border-line bg-surface hover:bg-line/40',
  danger: 'border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400',
};

type Variant = keyof typeof buttonStyles;
const btn = (v: Variant) =>
  `inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${buttonStyles[v]}`;

export function Button({ variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={`${btn(variant)} ${className}`} {...props} />;
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${btn(variant)} ${className}`} {...props} />;
}

const tones = {
  gray: 'bg-line/60 text-fg',
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

const statusTone = {
  ok: 'green', succeeded: 'green', Running: 'green',
  error: 'red', failed: 'red',
  running: 'blue',
  pending: 'amber', unknown: 'gray', canceled: 'gray', Halted: 'gray',
} as const;

const statusLabel: Record<string, string> = {
  ok: 'Conectado', error: 'Error', unknown: 'Sin probar',
  pending: 'En cola', running: 'En curso', succeeded: 'Completada', failed: 'Fallida', canceled: 'Cancelada',
  Running: 'Encendida', Halted: 'Apagada', Suspended: 'Suspendida', Paused: 'Pausada',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status as keyof typeof statusTone] ?? 'gray'}>{statusLabel[status] ?? status}</Badge>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={value}>
      <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-line/30 text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className = '', ...props }: ComponentProps<'td'>) {
  return <td className={`px-4 py-2.5 align-middle ${className}`} {...props} />;
}

export function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-7 w-48 rounded bg-line/60" />
      <div className="h-32 rounded-lg bg-line/40" />
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
