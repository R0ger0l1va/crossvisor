'use client';

import { useState, useTransition } from 'react';
import { startPlan } from '@/actions/plans';
import { Button } from '@/components/ui';

export function StartPlanButton({ planId, disabled }: { planId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      <Button
        disabled={pending || disabled}
        onClick={() => {
          if (!confirm('Las VMs de origen se APAGARÁN (migración en frío). ¿Continuar?')) return;
          startTransition(async () => setError((await startPlan(planId)).error));
        }}
      >
        {pending ? 'Iniciando…' : 'Iniciar migración'}
      </Button>
    </div>
  );
}
