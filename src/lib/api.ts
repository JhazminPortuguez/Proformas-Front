const BASE = '/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  rol: 'admin' | 'vendedor' | 'operario';
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=') : null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init.headers || {}),
  });
  const xsrf = getCookie('XSRF-TOKEN');
  if (xsrf) headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrf));

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('No autenticado');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
  return api<AuthUser>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export const logout = () => api('/logout', { method: 'POST' });

export const me = () => api<AuthUser>('/user');
