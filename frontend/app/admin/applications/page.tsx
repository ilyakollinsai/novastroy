'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiSend, downloadProtectedFile } from '@/lib/api';
import { Application } from '@/lib/types';
import { formatMoney, formatDateTime } from '@/lib/format';
import { ApplicationStatusBadge } from '@/components/StatusBadge';

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState('');
  const [tenderId, setTenderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentsByApp, setAttachmentsByApp] = useState<Record<number, any[]>>({});

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (tenderId) params.set('tenderId', tenderId);
    apiGet(`/api/admin/applications?${params.toString()}`)
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, tenderId]);

  async function handleStatusChange(id: number, newStatus: string) {
    await apiSend('PUT', `/api/admin/applications/${id}/status`, { status: newStatus });
    load();
  }

  async function toggleAttachments(id: number) {
    if (attachmentsByApp[id]) {
      setAttachmentsByApp((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const data = await apiGet(`/api/admin/applications/${id}`);
    setAttachmentsByApp((prev) => ({ ...prev, [id]: data.attachments }));
  }

  return (
    <div>
      <div className="doc-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="w-56">
          <label className="doc-label">Статус</label>
          <select className="doc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Все статусы</option>
            <option value="submitted">Подана</option>
            <option value="under_review">На рассмотрении</option>
            <option value="won">Победила</option>
            <option value="rejected">Отклонена</option>
          </select>
        </div>
        <div className="w-40">
          <label className="doc-label">ID тендера</label>
          <input
            type="number"
            className="doc-input"
            value={tenderId}
            onChange={(e) => setTenderId(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="text-ink-light">Загрузка…</p>}
      {error && <p className="text-stamp-red">{error}</p>}

      <div className="grid gap-3">
        {applications.map((a) => (
          <div key={a.id} className="doc-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/admin/tenders/${a.tender_id}/edit`} className="text-xs uppercase tracking-wide text-ink-faint underline">
                  {a.tender_public_code} · {a.tender_title}
                </Link>
                <div className="font-medium mt-1">{a.company_name}</div>
                <div className="text-xs text-ink-light">
                  ИНН {a.inn} · {a.contact_person} · {a.phone}
                </div>
                <div className="text-sm text-ink-light mt-1">
                  Цена: {formatMoney(a.proposed_price)} · подана {formatDateTime(a.submitted_at)}
                </div>
                {a.comment && <p className="text-sm mt-1">{a.comment}</p>}
                <button className="text-xs underline text-ink-light mt-2" onClick={() => toggleAttachments(a.id)}>
                  {attachmentsByApp[a.id] ? 'Скрыть вложения' : 'Показать вложения'}
                </button>
                {attachmentsByApp[a.id] && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {attachmentsByApp[a.id].length === 0 && (
                      <li className="text-ink-light">Нет вложений</li>
                    )}
                    {attachmentsByApp[a.id].map((att: any) => (
                      <li key={att.id}>
                        <button
                          className="underline"
                          onClick={() =>
                            downloadProtectedFile(
                              `/api/admin/applications/${a.id}/attachments/${att.id}`,
                              att.original_name,
                            )
                          }
                        >
                          {att.original_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ApplicationStatusBadge status={a.status} />
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
              </div>
            </div>
          </div>
        ))}
        {!loading && applications.length === 0 && (
          <p className="text-ink-light">Заявок не найдено.</p>
        )}
      </div>
    </div>
  );
}
