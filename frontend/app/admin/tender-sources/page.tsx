'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, ApiError } from '@/lib/api';
import { TenderSourceRaw } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

function ApproveForm({ source, onDone }: { source: TenderSourceRaw; onDone: () => void }) {
  const [title, setTitle] = useState(source.parsed_title ?? '');
  const [description, setDescription] = useState(source.raw_text ?? '');
  const [category, setCategory] = useState('');
  const [sum, setSum] = useState(source.parsed_sum ?? '');
  const [deadline, setDeadline] = useState(
    source.parsed_deadline ? source.parsed_deadline.slice(0, 10) : '',
  );
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiSend('POST', `/api/admin/tender-sources/${source.id}/approve`, {
        title,
        description,
        category,
        sum: sum || undefined,
        deadline: deadline || undefined,
        requirements: requirements
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось опубликовать тендер');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleApprove} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      <div className="sm:col-span-2">
        <label className="doc-label">Название</label>
        <input required className="doc-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="doc-label">Описание</label>
        <textarea
          className="doc-input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Категория</label>
        <input className="doc-input" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div>
        <label className="doc-label">Сумма, ₽</label>
        <input
          type="number"
          className="doc-input"
          value={sum ?? ''}
          onChange={(e) => setSum(e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Срок подачи заявок</label>
        <input
          type="date"
          className="doc-input"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="doc-label">Требования (каждое с новой строки)</label>
        <textarea
          className="doc-input"
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-stamp-red">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Публикуем…' : 'Опубликовать тендер'}
        </button>
      </div>
    </form>
  );
}

export default function TenderSourcesPage() {
  const [sources, setSources] = useState<TenderSourceRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  function load() {
    setLoading(true);
    apiGet('/api/admin/tender-sources?status=pending')
      .then((data) => setSources(data.sources))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleReject(id: number) {
    if (!confirm('Отклонить этот пост? Тендер не будет создан.')) return;
    await apiSend('POST', `/api/admin/tender-sources/${id}/reject`);
    load();
  }

  return (
    <div>
      <p className="text-ink-light mb-4">
        Посты, автоматически собранные из Telegram-канала «НоваСтрой». Проверьте и доредактируйте
        поля перед публикацией — до подтверждения тендер не виден подрядчикам.
      </p>

      {loading && <p className="text-ink-light">Загрузка…</p>}
      {error && <p className="text-stamp-red">{error}</p>}
      {!loading && sources.length === 0 && (
        <p className="text-ink-light">Очередь модерации пуста.</p>
      )}

      <div className="grid gap-4">
        {sources.map((s) => {
          let mediaCount = 0;
          try {
            mediaCount = s.raw_media_paths ? JSON.parse(s.raw_media_paths).length : 0;
          } catch {
            mediaCount = 0;
          }
          return (
            <div key={s.id} className="doc-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-ink-faint">
                    Пост от {formatDateTime(s.fetched_at)} · вложений: {mediaCount}
                  </div>
                  <p className="whitespace-pre-wrap text-sm mt-1">{s.raw_text}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="btn-secondary"
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  >
                    {expanded === s.id ? 'Свернуть' : 'Одобрить'}
                  </button>
                  <button className="btn-secondary" onClick={() => handleReject(s.id)}>
                    Отклонить
                  </button>
                </div>
              </div>
              {expanded === s.id && <ApproveForm source={s} onDone={load} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
