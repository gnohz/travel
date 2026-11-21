export function readLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(`sedona-2026:${key}`); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
export function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(`sedona-2026:${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
