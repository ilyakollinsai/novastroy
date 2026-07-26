'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiSendForm, publicFileUrl, ApiError } from '@/lib/api';
import { Application, Tender, TenderAttachment } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { TenderStatusBadge, ApplicationStatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/components/AuthProvider';

function parseRequirements(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // не JSON — считаем обычным текстом
  }
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TenderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tender, setTender] = useState<Tender | null>(null);
  const [attachments, setAttachments] = useState<TenderAttachment[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proposedPrice, setProposedPrice] = useState('');
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet(`/api/tenders/${params.id}`)
      .then((data) => {
        if (cancelled) return;
        setTender(data.tender);
        setAttachments(data.attachments);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!user || user.role !== 'contractor') return;
    let cancelled = false;
    apiGet('/api/applications/me')
      .then((data) => {
        if (cancelled) return;
        const existing = (data.applications as Application[]).find(
          (a) => String(a.tender_id) === String(params.id),
        );
        setMyApplication(existing ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      if (proposedPrice) form.set('proposedPrice', proposedPrice);
      if (comment) form.set('comment', comment);
      if (files) {
        Array.from(files).forEach((f) => form.append('files', f));
      }
      await apiSendForm('POST', `/api/tenders/${params.id}/applications`, form);
      setSubmitted(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось подать заявку');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-ink-light">Загрузка…</p>;
  if (error || !tender) return <p className="text-stamp-red">{error ?? 'Тендер не найден'}</p>;

  const requirements = parseRequirements(tender.requirements);
  const canApply = tender.status === 'open' || tender.status === 'review';

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="doc-card p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="text-xs uppercase tracking-wide text-ink-faint">
              {tender.public_code ?? `#${tender.id}`}
              {tender.category ? ` · ${tender.category}` : ''}
            </div>
            <TenderStatusBadge status={tender.status} />
          </div>
          <h1 className="text-2xl font-bold font-serif mb-4">{tender.title}</h1>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-light mb-4 border-y border-brass-light/60 py-3">
            <span>Сумма: {formatMoney(tender.sum)}</span>
            <span>Срок подачи заявок: {formatDate(tender.deadline)}</span>
            {tender.winner_company_name && <span>Победитель: {tender.winner_company_name}</span>}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">{tender.description}</p>

          {requirements.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-light mb-2">
                Требования
              </h2>
              <ul className="list-disc list-inside text-sm space-y-1">
                {requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-light mb-2">
                Вложения
              </h2>
              <ul className="space-y-1 text-sm">
                {attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      className="text-ink underline"
                      href={publicFileUrl(`/api/tenders/${tender.id}/attachments/${a.id}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.original_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="doc-card p-6 sticky top-20">
          <h2 className="text-lg font-semibold mb-4">Подать заявку</h2>

          {!user && (
            <p className="text-sm text-ink-light">
              Чтобы подать заявку, войдите в личный кабинет подрядчика.
            </p>
          )}

          {user && user.role !== 'contractor' && (
            <p className="text-sm text-ink-light">Заявки подаются от имени подрядчика.</p>
          )}

          {user && user.role === 'contractor' && myApplication && (
            <div className="space-y-2">
              <p className="text-sm text-ink-light">Вы уже подали заявку на этот тендер.</p>
              <ApplicationStatusBadge status={myApplication.status} />
            </div>
          )}

          {user && user.role === 'contractor' && !myApplication && !canApply && (
            <p className="text-sm text-ink-light">Приём заявок по этому тендеру закрыт.</p>
          )}

          {user && user.role === 'contractor' && !myApplication && canApply && !submitted && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="doc-label">Ваша цена, ₽</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="doc-input"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="doc-label">Комментарий</label>
                <textarea
                  className="doc-input"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div>
                <label className="doc-label">Смета / КП (файлы)</label>
                <input
                  type="file"
                  multiple
                  className="text-sm"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </div>

              {formError && <p className="text-sm text-stamp-red">{formError}</p>}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Отправляем…' : 'Отправить заявку'}
              </button>
            </form>
          )}

          {submitted && (
            <p className="text-sm text-stamp-green font-medium">
              Заявка отправлена. Следить за статусом можно в личном кабинете.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
