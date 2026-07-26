'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiSend, ApiError } from '@/lib/api';
import { Tender } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { TenderStatusBadge } from '@/components/StatusBadge';

export default function AdminTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    apiGet(`/api/admin/tenders?${params.toString()}`)
      .then((data) => setTenders(data.tenders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, search]);

  async function handleDelete(id: number) {
    if (!confirm('Удалить тендер безвозвратно?')) return;
    try {
      await apiSend('DELETE', `/api/admin/tenders/${id}`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось удалить тендер');
    }
  }

  return (
    <div>
      <div className="doc-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="doc-label">Поиск</label>
          <input
            className="doc-input"
            placeholder="Название, описание или код"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-56">
          <label className="doc-label">Статус</label>
          <select className="doc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="open">Открыт</option>
            <option value="review">На рассмотрении</option>
            <option value="closed">Закрыт</option>
            <option value="won">Определён победитель</option>
          </select>
        </div>
        <Link href="/admin/tenders/new" className="btn-primary">
          + Новый тендер
        </Link>
      </div>

      {loading && <p className="text-ink-light">Загрузка…</p>}
      {error && <p className="text-stamp-red">{error}</p>}

      <div className="grid gap-3">
        {tenders.map((t) => (
          <div key={t.id} className="doc-card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-ink-faint">
                {t.public_code ?? `#${t.id}`} · {t.source === 'parsed' ? 'из Telegram' : 'вручную'}
              </div>
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-sm text-ink-light mt-1">
                {formatMoney(t.sum)} · срок {formatDate(t.deadline)}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <TenderStatusBadge status={t.status} />
              <Link href={`/admin/tenders/${t.id}/edit`} className="btn-secondary">
                Редактировать
              </Link>
              <button className="btn-secondary" onClick={() => handleDelete(t.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {!loading && tenders.length === 0 && <p className="text-ink-light">Тендеры не найдены.</p>}
      </div>
    </div>
  );
}
