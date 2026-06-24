// ─── Client-side API helper ────────────────────────────────────────────────────
// Reads the JWT from localStorage and attaches it to every request.

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('htn_access_token')
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  const body = await res.json().catch(() => ({ message: 'Request failed' }))
  if (!res.ok) throw new Error(body?.error ?? body?.message ?? `HTTP ${res.status}`)
  return body
}
