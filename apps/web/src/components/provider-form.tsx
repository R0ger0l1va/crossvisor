'use client';

import { useActionState, useState } from 'react';
import { createProvider, type FormState } from '@/actions/providers';
import { Button, Card, Field, inputClass } from '@/components/ui';

export function ProviderForm() {
  const [kind, setKind] = useState<'xcpng' | 'proxmox'>('xcpng');
  const [state, action, pending] = useActionState<FormState, FormData>(createProvider, {});

  return (
    <Card>
      <form action={action} className="space-y-5">
        <fieldset className="grid grid-cols-2 gap-2">
          {(['xcpng', 'proxmox'] as const).map((k) => (
            <label
              key={k}
              className={`cursor-pointer rounded-md border p-3 text-sm ${kind === k ? 'border-accent bg-accent/5' : 'border-line'}`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <span className="font-medium">{k === 'xcpng' ? 'XCP-ng' : 'Proxmox VE'}</span>
              <span className="block text-xs text-muted">{k === 'xcpng' ? 'Origen de las VMs' : 'Destino de las VMs'}</span>
            </label>
          ))}
        </fieldset>

        <Field label="Nombre">
          <input name="name" required className={inputClass} placeholder={kind === 'xcpng' ? 'Pool producción' : 'Clúster PVE'} />
        </Field>
        <Field
          label="URL"
          hint={kind === 'xcpng' ? 'Dirección del pool master, ej. https://192.168.1.10' : 'Ej. https://192.168.1.20:8006'}
        >
          <input name="url" type="url" required className={inputClass} />
        </Field>

        {kind === 'xcpng' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuario"><input name="username" defaultValue="root" required className={inputClass} /></Field>
            <Field label="Contraseña"><input name="password" type="password" required className={inputClass} /></Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Token ID" hint="Datacenter → Permissions → API Tokens. Ej. root@pam!crossvisor">
              <input name="tokenId" required className={inputClass} />
            </Field>
            <Field label="Token secret" hint="UUID que Proxmox muestra una sola vez">
              <input name="tokenSecret" type="password" required className={inputClass} />
            </Field>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="insecureTls" defaultChecked />
          Aceptar certificados autofirmados
        </label>

        {state.error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}

        <Button type="submit" disabled={pending}>{pending ? 'Conectando…' : 'Guardar y probar conexión'}</Button>
      </form>
    </Card>
  );
}
