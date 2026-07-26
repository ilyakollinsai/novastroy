'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/tenders');
  }

  const linkClass = (href: string) =>
    `text-sm px-3 py-1.5 rounded-sm transition-colors ${
      pathname?.startsWith(href) ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
    }`;

  return (
    <header className="border-b border-brass-light bg-paper/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/tenders" className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-bold tracking-tight">НоваСтрой</span>
          <span className="text-xs uppercase tracking-widest text-ink-light">портал тендеров</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/tenders" className={linkClass('/tenders')}>
            Тендеры
          </Link>
          {user?.role === 'contractor' && (
            <>
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                Мой кабинет
              </Link>
            </>
          )}
          {user?.role === 'admin' && (
            <Link href="/admin" className={linkClass('/admin')}>
              Админка
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-ink-light hidden sm:inline">{user.email}</span>
              <button className="btn-secondary" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-secondary">
                Войти
              </Link>
              <Link href="/auth/register" className="btn-primary">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
