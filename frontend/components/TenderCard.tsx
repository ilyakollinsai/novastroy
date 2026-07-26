import Link from 'next/link';
import { Tender } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { TenderStatusBadge } from './StatusBadge';

export function TenderCard({ tender }: { tender: Tender }) {
  return (
    <Link
      href={`/tenders/${tender.id}`}
      className="doc-card block p-5 hover:shadow-none transition-shadow hover:-translate-y-0.5 duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-1">
            {tender.public_code ?? `#${tender.id}`}
            {tender.category ? ` · ${tender.category}` : ''}
          </div>
          <h3 className="text-lg font-semibold font-serif leading-snug">{tender.title}</h3>
        </div>
        <TenderStatusBadge status={tender.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-light">
        <span>Сумма: {formatMoney(tender.sum)}</span>
        <span>Срок подачи: {formatDate(tender.deadline)}</span>
      </div>
    </Link>
  );
}
