'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Application } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { ApplicationStatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/api/applications/me')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const wins = applications.filter((a) => a.status === 'won');

  return (
    <div className="space-y-8">
      {wins.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">История побед</h2>
          <div className="grid gap-3">
            {wins.map((a) => (
              <div key={a.id} className="doc-card p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-faint">
                    {a.tender_public_code}
                  </div>
                  <div className="font-medium">{a.tender_title}</div>
                </div>
                <ApplicationStatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Мои заявки</h2>

        {loading && <p className="text-ink-light">Загрузка…</p>}
        {error && <p className="text-stamp-red">{error}</p>}
        {!loading && applications.length === 0 && (
          <p className="text-ink-light">
            Вы ещё не подавали заявок.{' '}
            <Link href="/tenders" className="underline">
              Посмотреть тендеры
            </Link>
          </p>
        )}

        <div className="grid gap-3">
          {applications.map((a) => (
            <Link
              key={a.id}
              href={`/tenders/${a.tender_id}`}
              className="doc-card p-4 flex items-center justify-between hover:-translate-y-0.5 transition-transform"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-faint">
                  {a.tender_public_code} · подана {formatDate(a.submitted_at)}
                </div>
                <div className="font-medium">{a.tender_title}</div>
                <div className="text-sm text-ink-light mt-1">
                  Ваша цена: {formatMoney(a.proposed_price)}
                </div>
              </div>
              <ApplicationStatusBadge status={a.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
