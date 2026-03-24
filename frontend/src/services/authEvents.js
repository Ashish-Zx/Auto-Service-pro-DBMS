const AUTH_EXPIRED_EVENT = 'autoservice:auth-expired';

export function notifyAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

export function onAuthExpired(handler) {
  window.addEventListener(AUTH_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
}
