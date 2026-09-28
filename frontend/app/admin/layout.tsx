'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin') {
    return <p className="text-ink-light">Загрузка…</p>;
  }

  const tabClass = (href: string) =>
    `px-3 py-1.5 text-sm rounded-sm ${
      pathname === href ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Админка «Строй Инжиниринг»</h1>
        <nav className="flex gap-1">
          <Link href="/admin" className={tabClass('/admin')}>
            Тендеры
          </Link>
          <Link href="/admin/applications" className={tabClass('/admin/applications')}>
            Заявки
          </Link>
          <Link href="/admin/tender-sources" className={tabClass('/admin/tender-sources')}>
            Модерация Telegram
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
