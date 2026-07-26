export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('novastroy_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('novastroy_token', token);
  else localStorage.removeItem('novastroy_token');
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function handle(res: Response) {
  if (res.status === 204) return null;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (isJson && (body as any)?.error) || res.statusText || 'Ошибка запроса';
    throw new ApiError(message, res.status, isJson ? (body as any)?.details : undefined);
  }
  return body;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { ...authHeaders() } });
  return handle(res);
}

export async function apiSend(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export async function apiSendForm(
  method: 'POST' | 'PUT',
  path: string,
  form: FormData,
) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...authHeaders() },
    body: form,
  });
  return handle(res);
}

export async function downloadProtectedFile(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new ApiError('Не удалось скачать файл', res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function publicFileUrl(path: string) {
  return `${API_URL}${path}`;
}
