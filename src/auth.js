const KEY = 'app_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

/** Returns headers object with Authorization bearer token. */
export const getAuthHeader = () => ({ Authorization: `Bearer ${getToken() || ''}` });

/** Call this when any API response comes back 401. */
export const handleUnauthorized = () => {
  clearToken();
  window.location.reload();
};
