import apiFetch from "./api.js";

/**
 * Fetch email list from inbox.
 * @param {Object} params - { maxResults, q, pageToken, label }
 */
export async function fetchEmails(params = {}) {
  const query = new URLSearchParams();
  if (params.maxResults) query.set("maxResults", params.maxResults);
  if (params.q) query.set("q", params.q);
  if (params.pageToken) query.set("pageToken", params.pageToken);
  if (params.label) query.set("label", params.label);

  const qs = query.toString();
  return apiFetch(`/emails${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch a single email by ID (with full body).
 */
export async function fetchEmailById(id) {
  return apiFetch(`/emails/${id}`);
}
