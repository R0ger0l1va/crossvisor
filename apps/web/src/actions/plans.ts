'use server';

import { createPlanSchema, type CreatePlanDto, type Migration, type Plan } from '@crossvisor/contracts';
import { refresh, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export async function createPlan(dto: CreatePlanDto): Promise<{ error?: string }> {
  const parsed = createPlanSchema.safeParse(dto);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' · ') };
  let plan: Plan;
  try {
    plan = await api<Plan>('/plans', { method: 'POST', body: JSON.stringify(parsed.data) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el plan' };
  }
  revalidatePath('/plans');
  redirect(`/plans/${plan.id}`);
}

export async function startPlan(id: string): Promise<{ error?: string }> {
  try {
    await api<Migration[]>(`/plans/${id}/start`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo iniciar el plan' };
  }
  refresh();
  return {};
}
