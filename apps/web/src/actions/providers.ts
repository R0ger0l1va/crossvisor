'use server';

import { createProviderSchema, type Provider } from '@crossvisor/contracts';
import { refresh, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export type FormState = { error?: string };

export async function createProvider(_prev: FormState, form: FormData): Promise<FormState> {
  const kind = form.get('kind');
  const parsed = createProviderSchema.safeParse({
    kind,
    name: form.get('name'),
    url: form.get('url'),
    insecureTls: form.get('insecureTls') === 'on',
    ...(kind === 'xcpng'
      ? { username: form.get('username'), password: form.get('password') }
      : { tokenId: form.get('tokenId'), tokenSecret: form.get('tokenSecret') }),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' · ') };

  let created: Provider;
  try {
    created = await api<Provider>('/providers', { method: 'POST', body: JSON.stringify(parsed.data) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el proveedor' };
  }
  revalidatePath('/providers');
  redirect(`/providers/${created.id}`);
}

export async function testProvider(id: string) {
  await api(`/providers/${id}/test`, { method: 'POST' });
  refresh();
}

export async function deleteProvider(id: string) {
  await api(`/providers/${id}`, { method: 'DELETE' });
  revalidatePath('/providers');
  redirect('/providers');
}
