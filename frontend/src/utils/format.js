/**
 * Small formatting helpers shared across pages.
 * Kept out of component files so Fast Refresh stays intact.
 */

/** Up to two uppercase initials from a name. Always returns something. */
export const getInitials = (name) => {
  if (!name || typeof name !== "string") return "SA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

/** Seconds → mm:ss */
export const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Percentage, guarding against a zero denominator. */
export const toPercent = (value, total) =>
  total > 0 ? Math.round((value / total) * 100) : 0;
