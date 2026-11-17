import Link from 'next/link';
import { Suspense } from 'react';
import { NavLinks, NavLinksStatic } from './nav-links';

/** Shell estático (se prerenderiza); solo los enlaces dependen de la URL actual. */
export function Sidebar() {
  return (
    <aside className="border-b border-line bg-surface md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          crossvisor
        </Link>
        <p className="text-xs text-muted">XCP-ng → Proxmox VE</p>
      </div>
      <Suspense fallback={<NavLinksStatic />}>
        <NavLinks />
      </Suspense>
    </aside>
  );
}
