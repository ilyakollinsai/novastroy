export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'не указана';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return 'не указана';
  return `${new Intl.NumberFormat('ru-RU').format(num)} ₽`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'не указан';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не указан';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    date,
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
