'use client';

import { useRouter } from 'next/navigation';
import { apiSendForm } from '@/lib/api';
import { TenderForm, emptyTenderForm } from '@/components/TenderForm';

export default function NewTenderPage() {
  const router = useRouter();

  async function handleSubmit(form: FormData) {
    const data = await apiSendForm('POST', '/api/admin/tenders', form);
    router.push(`/admin/tenders/${data.id}/edit`);
  }

  return (
    <div className="doc-card p-6 max-w-3xl">
      <h2 className="text-lg font-semibold mb-4">Новый тендер</h2>
      <TenderForm initial={emptyTenderForm} submitLabel="Создать тендер" onSubmit={handleSubmit} />
    </div>
  );
}
