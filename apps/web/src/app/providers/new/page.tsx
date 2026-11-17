import { ProviderForm } from '@/components/provider-form';
import { PageHeader } from '@/components/ui';

export default function NewProviderPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Añadir proveedor" subtitle="Las credenciales se guardan cifradas (AES-256-GCM) en PostgreSQL." />
      <ProviderForm />
    </div>
  );
}
