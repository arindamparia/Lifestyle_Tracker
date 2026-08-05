const KEY = 'app_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);
export const removeToken = clearToken;

/** Returns headers object with Authorization bearer token. */
export const getAuthHeader = () => ({ Authorization: `Bearer ${getToken() || ''}` });

/** Call this when any API response comes back 401. */
export const handleUnauthorized = () => {
  clearToken();
  window.location.reload();
};
export const isTokenExpired = () => {
  const t = getToken();
  if (!t) return true;
  try {
    const payloadB64 = t.split('.')[0];
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadStr = atob(b64);
    const payload = JSON.parse(payloadStr);
    if (!payload.exp) return true;
    return Date.now() > payload.exp;
  } catch (e) {
    return true;
  }
};

export const getTimeUntilExpiry = () => {
  const t = getToken();
  if (!t) return 0;
  try {
    const payloadB64 = t.split('.')[0];
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    if (!payload.exp) return 0;
    return payload.exp - Date.now();
  } catch (e) {
    return 0;
  }
};
