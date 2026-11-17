export function bytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function dateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));
}
