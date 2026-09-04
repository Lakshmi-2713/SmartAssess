/**
 * Single source of truth for the signed-in user and their token.
 *
 * Every read is defensive: a corrupt `smartassess_session` value used to throw
 * from inside a component's render and white-screen the whole app.
 */

const SESSION_KEY = "smartassess_session";
const LEGACY_KEY = "user";

/** Safe localStorage read — returns `fallback` instead of throwing. */
export const safeGet = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    // Corrupt or non-JSON value: drop it rather than crash on every render.
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    return fallback;
  }
};

/** Safe localStorage write — returns false when the quota is exceeded. */
export const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Could not persist "${key}":`, err?.name || err);
    return false;
  }
};

export const safeRemove = (key) => {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
};

export const getSession = () => {
  const session = safeGet(SESSION_KEY);
  if (session && typeof session === "object" && session.user) return session;
  return null;
};

export const getUser = () => getSession()?.user || null;
export const getToken = () => getSession()?.token || null;
export const isAuthenticated = () => Boolean(getToken() && getUser());

export const getRole = () => getUser()?.role || null;

export const saveSession = ({ token, user }) => {
  const session = { token, user, savedAt: Date.now() };
  safeSet(SESSION_KEY, session);
  // Kept in sync for any legacy reader still looking at "user".
  safeSet(LEGACY_KEY, user);
  window.dispatchEvent(new CustomEvent("smartassess:session", { detail: session }));
  return session;
};

export const clearSession = () => {
  safeRemove(SESSION_KEY);
  safeRemove(LEGACY_KEY);
  safeRemove("smartassess_active_test");
  window.dispatchEvent(new CustomEvent("smartassess:session", { detail: null }));
};

/** Landing route for a role. */
export const homePathFor = (role) =>
  role === "admin" ? "/admin" : role === "student" ? "/student" : "/faculty";
