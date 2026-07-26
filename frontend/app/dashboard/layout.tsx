'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'contractor')) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'contractor') {
    return <p className="text-ink-light">Загрузка…</p>;
  }

  const tabClass = (href: string) =>
    `px-3 py-1.5 text-sm rounded-sm ${
      pathname === href ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Личный кабинет подрядчика</h1>
        <nav className="flex gap-1">
          <Link href="/dashboard" className={tabClass('/dashboard')}>
            Мои заявки
          </Link>
          <Link href="/dashboard/profile" className={tabClass('/dashboard/profile')}>
            Профиль
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
