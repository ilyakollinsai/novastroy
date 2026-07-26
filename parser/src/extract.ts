const MONTHS: Record<string, number> = {
  'янв': 1, 'февр': 2, 'фев': 2, 'март': 3, 'мар': 3, 'апр': 4, 'ма': 5, 'май': 5, 'мая': 5,
  'июн': 6, 'июл': 7, 'авг': 8, 'сент': 9, 'сен': 9, 'окт': 10, 'нояб': 11, 'ноя': 11, 'дек': 12,
};

// Заголовок — первая непустая строка поста.
export function extractTitle(rawText: string): string | null {
  const line = rawText
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ? line.slice(0, 500) : null;
}

// Сумма — первое число рядом с "₽" / "руб". best-effort, не критично для точности.
export function extractSum(rawText: string): number | null {
  const match = rawText.match(/([\d\s.,]{2,})\s?(?:₽|руб\.?)/iu);
  if (!match) return null;
  const digits = match[1].replace(/[^\d.,]/g, '').replace(/\s/g, '');
  const normalized = digits.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

// Срок — дата в формате ДД.ММ.ГГГГ или "ДД <месяц> ГГГГ".
export function extractDeadline(rawText: string): string | null {
  const numeric = rawText.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10);
    let year = parseInt(numeric[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthNames = Object.keys(MONTHS).join('|');
  const textual = rawText.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\w*\\s+(\\d{4})\\b`, 'iu'));
  if (textual) {
    const day = parseInt(textual[1], 10);
    const monthKey = textual[2].toLowerCase();
    const month = MONTHS[monthKey];
    const year = parseInt(textual[3], 10);
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}
