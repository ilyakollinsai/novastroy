'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiSendForm, apiSend, downloadProtectedFile, ApiError } from '@/lib/api';
import { Application, Tender, TenderAttachment } from '@/lib/types';
import { TenderForm, TenderFormValues } from '@/components/TenderForm';
import { ApplicationStatusBadge } from '@/components/StatusBadge';
import { formatMoney, formatDate } from '@/lib/format';

function toFormValues(tender: Tender): TenderFormValues {
  let requirements = '';
  if (tender.requirements) {
    try {
      const parsed = JSON.parse(tender.requirements);
      requirements = Array.isArray(parsed) ? parsed.join('\n') : tender.requirements;
    } catch {
      requirements = tender.requirements;
    }
  }
  return {
    title: tender.title,
    description: tender.description ?? '',
    category: tender.category ?? '',
    sum: tender.sum ?? '',
    deadline: tender.deadline ? tender.deadline.slice(0, 10) : '',
    status: tender.status,
    requirements,
  };
}

export default function EditTenderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [attachments, setAttachments] = useState<TenderAttachment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      apiGet(`/api/admin/tenders/${params.id}`),
      apiGet(`/api/admin/applications?tenderId=${params.id}`),
    ])
      .then(([tenderData, appsData]) => {
        setTender(tenderData.tender);
        setAttachments(tenderData.attachments);
        setApplications(appsData.applications);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]);

  async function handleSubmit(form: FormData) {
    await apiSendForm('PUT', `/api/admin/tenders/${params.id}`, form);
    load();
  }

  async function handleAssignWinner(contractorId: number) {
    setWinnerError(null);
    if (!confirm('Назначить победителем? Остальные заявки будут отклонены.')) return;
    try {
      await apiSend('PUT', `/api/admin/tenders/${params.id}/winner`, { contractorId });
      load();
    } catch (err) {
      setWinnerError(err instanceof ApiError ? err.message : 'Не удалось назначить победителя');
    }
  }

  async function handleStatusChange(applicationId: number, status: string) {
    await apiSend('PUT', `/api/admin/applications/${applicationId}/status`, { status });
    load();
  }

  if (loading) return <p className="text-ink-light">Загрузка…</p>;
  if (error || !tender) return <p className="text-stamp-red">{error ?? 'Тендер не найден'}</p>;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 doc-card p-6">
        <h2 className="text-lg font-semibold mb-1">
          Редактирование тендера {tender.public_code ?? `#${tender.id}`}
        </h2>
        <p className="text-sm text-ink-light mb-4">
          Источник: {tender.source === 'parsed' ? 'Telegram-канал' : 'создан вручную'}
        </p>
        <TenderForm
          initial={toFormValues(tender)}
          submitLabel="Сохранить изменения"
          onSubmit={handleSubmit}
        />

        {attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-brass-light/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-light mb-2">
              Вложения
            </h3>
            <ul className="space-y-1 text-sm">
              {attachments.map((a) => (
                <li key={a.id}>
                  <button
                    className="text-ink underline"
                    onClick={() =>
                      downloadProtectedFile(
                        `/api/admin/tenders/${tender.id}/attachments/${a.id}`,
                        a.original_name,
                      )
                    }
                  >
                    {a.original_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="doc-card p-6">
        <h3 className="text-lg font-semibold mb-4">Заявки по тендеру</h3>
        {winnerError && <p className="text-sm text-stamp-red mb-2">{winnerError}</p>}
        {applications.length === 0 && <p className="text-sm text-ink-light">Заявок пока нет.</p>}
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="border border-brass-light rounded-sm p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{a.company_name}</div>
                  <div className="text-xs text-ink-light">ИНН {a.inn}</div>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </div>
              <div className="text-sm text-ink-light mt-1">
                Цена: {formatMoney(a.proposed_price)} · подана {formatDate(a.submitted_at)}
              </div>
              {a.comment && <p className="text-sm mt-1">{a.comment}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                <select
                  className="doc-input text-xs py-1"
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.id, e.target.value)}
                >
                  <option value="submitted">Подана</option>
                  <option value="under_review">На рассмотрении</option>
                  <option value="won">Победила</option>
                  <option value="rejected">Отклонена</option>
                </select>
                {a.status !== 'won' && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => handleAssignWinner(a.contractor_id)}
                  >
                    Назначить победителем
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-secondary w-full mt-4" onClick={() => router.push('/admin')}>
          К списку тендеров
        </button>
      </div>
    </div>
  );
}
