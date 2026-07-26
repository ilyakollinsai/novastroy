import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'НоваСтрой — портал тендеров для подрядчиков',
  description: 'Тендеры, заявки и статусы подрядчиков компании «НоваСтрой»',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
