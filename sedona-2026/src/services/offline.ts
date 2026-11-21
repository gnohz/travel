export type OfflineState = { ready: boolean; waiting: boolean; busy: boolean; message: string };
let registration: ServiceWorkerRegistration | undefined;
let state: OfflineState = { ready: false, waiting: false, busy: false, message: '离线内容尚未准备' };
const listeners = new Set<(s: OfflineState) => void>();
const update = (next: Partial<OfflineState>) => { state = { ...state, ...next }; listeners.forEach(l => l(state)); };
export function subscribeOffline(listener: (s: OfflineState) => void) { listeners.add(listener); listener(state); return () => { listeners.delete(listener); }; }
async function checkCache() {
  const worker = navigator.serviceWorker.controller ?? registration?.active;
  if (!worker) return;
  const channel = new MessageChannel();
  const reply = new Promise<boolean>(resolve => {
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 5000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true); };
  });
  worker.postMessage({ type: 'CACHE_STATUS' }, [channel.port2]);
  const ready = await reply;
  update({ ready, message: ready ? '已准备好离线使用' : '离线资源未完整保存，请联网后重试' });
}
let started = false;
export async function startOffline() {
  if (started) return; started = true;
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    update({ message: import.meta.env.DEV ? '开发预览 · 离线功能在构建版启用' : '此浏览器暂不支持离线缓存' }); return;
  }
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
    const installed = () => {
      const waiting = !!registration?.waiting && !!navigator.serviceWorker.controller;
      update({ waiting, busy: false, ...(waiting ? { message: '发现新版本，立即更新' } : {}) });
      void checkCache();
    };
    registration.addEventListener('updatefound', () => {
      const worker = registration?.installing;
      update({ busy: true, message: '正在保存离线内容…' });
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') { update({ busy: false }); installed(); }
        if (worker.state === 'activated') installed();
        if (worker.state === 'redundant') update({ busy: false, message: '保存失败，请联网后重试' });
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying) location.reload(); else { update({ waiting: !!registration?.waiting }); void checkCache(); } });
    await navigator.serviceWorker.ready;
    installed();
    window.addEventListener('online', () => { void checkForUpdate(); });
  } catch { update({ busy: false, message: '离线准备失败，请联网后重试' }); }
}
let applying = false;
export async function checkForUpdate() {
  if (!navigator.onLine) { update({ message: '当前离线，正在使用已保存的行程' }); return; }
  if (!registration) { started = false; await startOffline(); if (!registration) return; }
  update({ busy: true, message: '正在检查更新…' });
  try {
    await registration.update();
    if (registration.waiting) update({ waiting: true, message: '发现新版本，立即更新' });
    else if (!registration.installing) { await checkCache(); update({ waiting: false, message: state.ready ? '已是最新版本 · 离线内容已保存' : state.message }); }
  } catch { update({ message: '更新检查失败，保留已保存的行程' }); }
  finally { update({ busy: !!registration?.installing }); }
}
export function applyUpdate() {
  if (!registration?.waiting) { update({ waiting: false, busy: false }); void checkForUpdate(); return; }
  applying = true; update({ busy: true, message: '正在应用新版本…' });
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
