/**
 * Theme palettes. Separated from ThemeContext so that file exports only
 * components/hooks and React Fast Refresh keeps working.
 */

export const ACCENT_COLORS = {
  indigo:  { name: "Indigo",  primary: "#4f46e5", hover: "#4338ca", light: "#e0e7ff", ring: "rgba(79,70,229,0.32)" },
  violet:  { name: "Violet",  primary: "#7c3aed", hover: "#6d28d9", light: "#ede9fe", ring: "rgba(124,58,237,0.32)" },
  teal:    { name: "Teal",    primary: "#0d9488", hover: "#0f766e", light: "#ccfbf1", ring: "rgba(13,148,136,0.32)" },
  emerald: { name: "Emerald", primary: "#059669", hover: "#047857", light: "#d1fae5", ring: "rgba(5,150,105,0.32)" },
  amber:   { name: "Amber",   primary: "#d97706", hover: "#b45309", light: "#fef3c7", ring: "rgba(217,119,6,0.32)" },
  rose:    { name: "Rose",    primary: "#e11d48", hover: "#be123c", light: "#ffe4e6", ring: "rgba(225,29,72,0.32)" },
  sky:     { name: "Sky",     primary: "#0284c7", hover: "#0369a1", light: "#e0f2fe", ring: "rgba(2,132,199,0.32)" },
};

/** Dark mode needs lighter accents to stay legible on a dark surface. */
export const DARK_ACCENTS = {
  indigo:  { primary: "#818cf8", hover: "#a5b4fc", light: "#312e81", ring: "rgba(129,140,248,0.34)" },
  violet:  { primary: "#a78bfa", hover: "#c4b5fd", light: "#4c1d95", ring: "rgba(167,139,250,0.34)" },
  teal:    { primary: "#2dd4bf", hover: "#5eead4", light: "#134e4a", ring: "rgba(45,212,191,0.34)" },
  emerald: { primary: "#34d399", hover: "#6ee7b7", light: "#064e3b", ring: "rgba(52,211,153,0.34)" },
  amber:   { primary: "#fbbf24", hover: "#fcd34d", light: "#78350f", ring: "rgba(251,191,36,0.34)" },
  rose:    { primary: "#fb7185", hover: "#fda4af", light: "#881337", ring: "rgba(251,113,133,0.34)" },
  sky:     { primary: "#38bdf8", hover: "#7dd3fc", light: "#075985", ring: "rgba(56,189,248,0.34)" },
};

export const FONT_SIZES = { small: "15px", medium: "16px", large: "18px" };

export const STORAGE_KEYS = {
  mode: "smartassess_theme_mode",
  accent: "smartassess_accent_color",
  fontSize: "smartassess_font_size",
  compact: "smartassess_compact_sidebar",
  motion: "smartassess_reduced_motion",
  contrast: "smartassess_high_contrast",
  profile: "smartassess_user_profile",
};

export const DEFAULT_PROFILE = {
  name: "", email: "", role: "", department: "",
  phone: "", bio: "", location: "", avatar: "",
};
