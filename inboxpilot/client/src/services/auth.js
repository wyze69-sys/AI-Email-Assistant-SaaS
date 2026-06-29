import apiFetch from "./api.js";

/**
 * Extract token from URL params (after Google OAuth redirect) and store it.
 * This MUST run before any auth guard checks.
 * Returns true if a token was found and stored.
 */
export function captureTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem("token", token);
    // Clean URL without reloading — remove token and gmail params
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("gmail");
    window.history.replaceState({}, "", url.pathname + url.search);
    return true;
  }
  return false;
}

/**
 * Check if a JWT is stored locally.
 */
export function isAuthenticated() {
  return Boolean(localStorage.getItem("token"));
}

/**
 * Fetch current user profile from the backend.
 */
export async function fetchCurrentUser() {
  return apiFetch("/auth/me");
}

/**
 * Clear auth state and redirect to login.
 */
export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

/**
 * Get the Google OAuth login URL (server will redirect).
 */
export function getGoogleLoginURL() {
  const base = import.meta.env.VITE_API_BASE_URL || "/api";
  return `${base}/auth/google`;
}
