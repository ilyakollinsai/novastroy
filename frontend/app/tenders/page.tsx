'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Tender } from '@/lib/types';
import { TenderCard } from '@/components/TenderCard';

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'open', label: 'Открыт' },
  { value: 'review', label: 'На рассмотрении' },
  { value: 'closed', label: 'Закрыт' },
  { value: 'won', label: 'Определён победитель' },
];

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    params.set('page', String(page));

    apiGet(`/api/tenders?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setTenders(data.tenders);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [status, category, search, page]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Реестр тендеров</h1>
        <p className="text-ink-light mt-1">
          Актуальные закупки компании «НоваСтрой». Подайте заявку прямо на странице тендера.
        </p>
      </div>

      <div className="doc-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="doc-label">Поиск</label>
          <input
            className="doc-input"
            placeholder="Название или описание"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="w-48">
          <label className="doc-label">Статус</label>
          <select
            className="doc-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <label className="doc-label">Категория</label>
          <input
            className="doc-input"
            placeholder="напр. кровля"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
          />
        </div>
      </div>

      {loading && <p className="text-ink-light">Загрузка…</p>}
      {error && <p className="text-stamp-red">{error}</p>}

      {!loading && !error && tenders.length === 0 && (
        <p className="text-ink-light">Тендеры не найдены.</p>
      )}

      <div className="grid gap-4">
        {tenders.map((t) => (
          <TenderCard key={t.id} tender={t} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span className="px-3 py-2 text-sm text-ink-light">
            Стр. {page} из {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
