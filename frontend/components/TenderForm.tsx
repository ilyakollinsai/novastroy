'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { TenderStatus } from '@/lib/types';

export type TenderFormValues = {
  title: string;
  description: string;
  category: string;
  sum: string;
  deadline: string;
  status: TenderStatus;
  requirements: string;
};

export const emptyTenderForm: TenderFormValues = {
  title: '',
  description: '',
  category: '',
  sum: '',
  deadline: '',
  status: 'open',
  requirements: '',
};

export function TenderForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: TenderFormValues;
  submitLabel: string;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TenderFormValues>(key: K, value: TenderFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('title', values.title);
      form.set('description', values.description);
      form.set('category', values.category);
      if (values.sum) form.set('sum', values.sum);
      if (values.deadline) form.set('deadline', values.deadline);
      form.set('status', values.status);
      const requirementsList = values.requirements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      form.set('requirements', JSON.stringify(requirementsList));
      if (files) {
        Array.from(files).forEach((f) => form.append('files', f));
      }
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить тендер');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="doc-label">Название</label>
        <input
          required
          className="doc-input"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="doc-label">Описание</label>
        <textarea
          className="doc-input"
          rows={5}
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Категория</label>
        <input
          className="doc-input"
          value={values.category}
          onChange={(e) => update('category', e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Сумма, ₽</label>
        <input
          type="number"
          min="0"
          step="0.01"
          className="doc-input"
          value={values.sum}
          onChange={(e) => update('sum', e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Срок подачи заявок</label>
        <input
          type="date"
          className="doc-input"
          value={values.deadline}
          onChange={(e) => update('deadline', e.target.value)}
        />
      </div>
      <div>
        <label className="doc-label">Статус</label>
        <select
          className="doc-input"
          value={values.status}
          onChange={(e) => update('status', e.target.value as TenderStatus)}
        >
          <option value="draft">Черновик (на модерации)</option>
          <option value="open">Открыт</option>
          <option value="review">На рассмотрении</option>
          <option value="closed">Закрыт</option>
          <option value="won">Определён победитель</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="doc-label">Требования (каждое с новой строки)</label>
        <textarea
          className="doc-input"
          rows={4}
          value={values.requirements}
          onChange={(e) => update('requirements', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="doc-label">Добавить вложения</label>
        <input type="file" multiple className="text-sm" onChange={(e) => setFiles(e.target.files)} />
      </div>

      {error && <p className="sm:col-span-2 text-sm text-stamp-red">{error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Сохраняем…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
