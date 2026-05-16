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
    console.log("[Auth] Token param found in URL, saving to localStorage");
    localStorage.setItem("token", token);
    // Clean URL without reloading — remove token and gmail params
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("gmail");
    window.history.replaceState({}, "", url.pathname + url.search);
    console.log("[Auth] Token saved, URL cleaned");
    return true;
  }
  return false;
}

/**
 * Check if a JWT is stored locally.
 */
export function isAuthenticated() {
  const hasToken = Boolean(localStorage.getItem("token"));
  console.log("[Auth] isAuthenticated check:", hasToken);
  return hasToken;
}

/**
 * Fetch current user profile from the backend.
 */
export async function fetchCurrentUser() {
  console.log("[Auth] Fetching /api/auth/me");
  try {
    const data = await apiFetch("/auth/me");
    console.log("[Auth] /api/auth/me success:", data.email);
    return data;
  } catch (err) {
    console.error("[Auth] /api/auth/me failed:", err.message);
    throw err;
  }
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
