import { ApplicationStatus, TenderStatus } from '@/lib/types';

const TENDER_LABELS: Record<TenderStatus, string> = {
  draft: 'Черновик',
  open: 'Открыт',
  review: 'На рассмотрении',
  closed: 'Закрыт',
  won: 'Определён победитель',
};

const TENDER_COLORS: Record<TenderStatus, string> = {
  draft: 'border-stamp-gray text-stamp-gray',
  open: 'border-stamp-green text-stamp-green',
  review: 'border-stamp-amber text-stamp-amber',
  closed: 'border-stamp-gray text-stamp-gray',
  won: 'border-stamp-blue text-stamp-blue',
};

const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Подана',
  under_review: 'На рассмотрении',
  won: 'Победила',
  rejected: 'Отклонена',
};

const APPLICATION_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'border-stamp-gray text-stamp-gray',
  under_review: 'border-stamp-amber text-stamp-amber',
  won: 'border-stamp-green text-stamp-green',
  rejected: 'border-stamp-red text-stamp-red',
};

export function TenderStatusBadge({ status }: { status: TenderStatus }) {
  return <span className={`stamp ${TENDER_COLORS[status]}`}>{TENDER_LABELS[status]}</span>;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`stamp ${APPLICATION_COLORS[status]}`}>{APPLICATION_LABELS[status]}</span>;
}
