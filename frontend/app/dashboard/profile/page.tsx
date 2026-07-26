'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, ApiError } from '@/lib/api';
import { ContractorProfile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet('/api/profile')
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof ContractorProfile>(key: K, value: ContractorProfile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiSend('PUT', '/api/profile', {
        companyName: profile.company_name,
        inn: profile.inn,
        specialization: profile.specialization,
        phone: profile.phone,
        contactPerson: profile.contact_person,
        about: profile.about,
      });
      setProfile(data.profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-ink-light">Загрузка…</p>;
  if (!profile) return <p className="text-stamp-red">{error ?? 'Профиль не найден'}</p>;

  return (
    <div className="doc-card p-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="doc-label">Название компании</label>
          <input
            required
            className="doc-input"
            value={profile.company_name}
            onChange={(e) => update('company_name', e.target.value)}
          />
        </div>
        <div>
          <label className="doc-label">ИНН</label>
          <input
            required
            className="doc-input"
            value={profile.inn}
            onChange={(e) => update('inn', e.target.value)}
          />
        </div>
        <div>
          <label className="doc-label">Специализация</label>
          <input
            className="doc-input"
            value={profile.specialization}
            onChange={(e) => update('specialization', e.target.value)}
          />
        </div>
        <div>
          <label className="doc-label">Телефон</label>
          <input
            className="doc-input"
            value={profile.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="doc-label">Контактное лицо</label>
          <input
            className="doc-input"
            value={profile.contact_person}
            onChange={(e) => update('contact_person', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="doc-label">О компании</label>
          <textarea
            className="doc-input"
            rows={4}
            value={profile.about ?? ''}
            onChange={(e) => update('about', e.target.value)}
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-stamp-red">{error}</p>}
        {saved && <p className="sm:col-span-2 text-sm text-stamp-green">Профиль сохранён.</p>}

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
