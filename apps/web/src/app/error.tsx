'use client';

import { Button, Card } from '@/components/ui';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Algo salió mal</h2>
      <p className="text-sm text-muted">{error.message}</p>
      <p className="text-xs text-muted">¿Está corriendo la API? (pnpm dev en la raíz)</p>
      <Button variant="secondary" onClick={reset}>Reintentar</Button>
    </Card>
  );
}
