'use server';

import { refresh } from 'next/cache';
import { api } from '@/lib/api';

export async function retryMigration(id: string) {
  await api(`/migrations/${id}/retry`, { method: 'POST' });
  refresh();
}

export async function cancelMigration(id: string) {
  await api(`/migrations/${id}/cancel`, { method: 'POST' });
  refresh();
}
