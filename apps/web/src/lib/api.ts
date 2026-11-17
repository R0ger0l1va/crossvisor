import 'server-only';

/**
 * Cliente HTTP de la API (apps/api) para Server Components y Server Actions.
 * Los tipos vienen de @crossvisor/contracts: si cambia el contrato, TypeScript avisa aquí.
 */
export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, message ?? `Error ${res.status} en ${path}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
