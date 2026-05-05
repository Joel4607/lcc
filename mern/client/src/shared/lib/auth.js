export const TOKEN_STORAGE_KEY = "lcc_auth_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || fallbackMessage;
}
