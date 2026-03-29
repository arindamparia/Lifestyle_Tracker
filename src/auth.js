const KEY = 'app_token';

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t) => sessionStorage.setItem(KEY, t);
export const clearToken = () => sessionStorage.removeItem(KEY);

/** Returns headers object with Authorization bearer token. */
export const getAuthHeader = () => ({ Authorization: `Bearer ${getToken() || ''}` });

/** Call this when any API response comes back 401. */
export const handleUnauthorized = () => {
  clearToken();
  window.location.reload();
};
