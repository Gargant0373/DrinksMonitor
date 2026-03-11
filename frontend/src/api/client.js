/* Central API client — all fetch calls live here */

// In dev, Vite proxies /sessions /participants /drink /users → Flask on :5000
// In prod, set VITE_API_URL to the backend origin
const BASE = import.meta.env.VITE_API_URL ?? "";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const get  = (path)        => request("GET",    path);
const post = (path, body)  => request("POST",   path, body);
const del  = (path, body)  => request("DELETE", path, body);
const put  = (path, body)  => request("PUT",    path, body);

// ── Sessions ────────────────────────────────────────────────────────────────
export const createSession  = (name)       => post("/sessions", { name });
export const getSession     = (id)         => get(`/sessions/${id}`);
export const endSession     = (id)         => post(`/sessions/${id}/end`);
export const getSessionQRUrl = (id)        => `${BASE}/sessions/${id}/qr`;

// ── Drinks ───────────────────────────────────────────────────────────────────
export const listDrinks     = (sessionId)  => get(`/sessions/${sessionId}/drinks`);
export const addDrink       = (sessionId, drink) => post(`/sessions/${sessionId}/drinks`, drink);
export const loadPresets    = (sessionId)  => post(`/sessions/${sessionId}/drinks/presets`);

// ── Participants ─────────────────────────────────────────────────────────────
export const joinSession = (sessionId, payload) =>
  post(`/sessions/${sessionId}/join`, payload);

export const listParticipants = (sessionId) =>
  get(`/sessions/${sessionId}/participants`);

export const uploadAvatar = (participantId, blob) =>
  fetch(`${BASE}/participants/${participantId}/avatar`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  }).then((r) => r.json());

export const avatarUrl = (participantId) =>
  `${BASE}/participants/${participantId}/avatar`;

// ── Drink logs ───────────────────────────────────────────────────────────────
export const logDrink = (sessionId, participantId, drinkId) =>
  post("/drink", { session_id: sessionId, participant_id: participantId, drink_id: drinkId });

export const deleteDrink = (logId, participantId) =>
  del(`/drink/${logId}`, { participant_id: participantId });

export const getLogs = (sessionId) =>
  get(`/sessions/${sessionId}/logs`);

// ── Stats ────────────────────────────────────────────────────────────────────
export const getStats = (sessionId) =>
  get(`/sessions/${sessionId}/stats`);

// ── Users ────────────────────────────────────────────────────────────────────
export const createUser = (username, date_of_birth) =>
  post("/users", { username, date_of_birth });

export const loginUser = (username, date_of_birth) =>
  post("/users/login", { username, date_of_birth });
