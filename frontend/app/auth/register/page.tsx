'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    companyName: '',
    inn: '',
    specialization: '',
    phone: '',
    contactPerson: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось зарегистрироваться');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="doc-card p-8">
        <h1 className="text-2xl font-bold mb-1">Регистрация подрядчика</h1>
        <p className="text-sm text-ink-light mb-6">
          Заполните данные компании — они будут видны заказчику при рассмотрении заявок.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="doc-label">Email</label>
            <input
              type="email"
              required
              className="doc-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="doc-label">Пароль (не менее 8 символов)</label>
            <input
              type="password"
              required
              minLength={8}
              className="doc-input"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="doc-label">Название компании</label>
            <input
              required
              className="doc-input"
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
            />
          </div>
          <div>
            <label className="doc-label">ИНН</label>
            <input
              required
              className="doc-input"
              value={form.inn}
              onChange={(e) => update('inn', e.target.value)}
            />
          </div>
          <div>
            <label className="doc-label">Специализация</label>
            <input
              className="doc-input"
              placeholder="напр. отделочные работы"
              value={form.specialization}
              onChange={(e) => update('specialization', e.target.value)}
            />
          </div>
          <div>
            <label className="doc-label">Телефон</label>
            <input
              className="doc-input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="doc-label">Контактное лицо</label>
            <input
              className="doc-input"
              value={form.contactPerson}
              onChange={(e) => update('contactPerson', e.target.value)}
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm text-stamp-red">{error}</p>}

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Регистрируем…' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <p className="text-sm text-ink-light mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-ink underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
