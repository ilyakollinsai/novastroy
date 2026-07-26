'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="doc-card p-8">
        <h1 className="text-2xl font-bold mb-1">Вход в личный кабинет</h1>
        <p className="text-sm text-ink-light mb-6">Портал тендеров «НоваСтрой»</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="doc-label">Email</label>
            <input
              type="email"
              required
              className="doc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="doc-label">Пароль</label>
            <input
              type="password"
              required
              className="doc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-stamp-red">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="text-sm text-ink-light mt-6">
          Ещё нет аккаунта?{' '}
          <Link href="/auth/register" className="text-ink underline">
            Зарегистрироваться как подрядчик
          </Link>
        </p>
      </div>
    </div>
  );
}
