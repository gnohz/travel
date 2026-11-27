// AbortSignal.timeout is unavailable in some Safari versions supported by the site.
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, milliseconds = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
