'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Panel' },
  { href: '/providers', label: 'Proveedores' },
  { href: '/plans', label: 'Planes de migración' },
] as const;

function Nav({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
      {links.map(({ href, label }) => {
        const active = pathname !== null && (href === '/' ? pathname === '/' : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
              active ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-line/40 hover:text-fg'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLinks() {
  return <Nav pathname={usePathname()} />;
}

/** Versión sin estado activo para el prerender. */
export function NavLinksStatic() {
  return <Nav pathname={null} />;
}
