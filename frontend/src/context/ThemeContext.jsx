import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { safeGet, safeSet } from "../services/session";
import {
  ACCENT_COLORS,
  DARK_ACCENTS,
  FONT_SIZES,
  STORAGE_KEYS as KEYS,
  DEFAULT_PROFILE,
} from "./themeTokens";

const ThemeContext = createContext(null);

const readString = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const readBool = (key) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => readString(KEYS.mode, "system"));
  const [accentColor, setAccentColor] = useState(() => readString(KEYS.accent, "indigo"));
  const [fontSize, setFontSize] = useState(() => readString(KEYS.fontSize, "medium"));
  const [compactSidebar, setCompactSidebar] = useState(() => readBool(KEYS.compact));
  const [reducedMotion, setReducedMotion] = useState(() => readBool(KEYS.motion));
  const [highContrast, setHighContrast] = useState(() => readBool(KEYS.contrast));

  const [userProfile, setUserProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(safeGet(KEYS.profile) || {}),
  }));

  // Tracks the OS preference so "system" mode actually follows it live.
  const [systemDark, setSystemDark] = useState(() => {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return undefined;
    }
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolvedMode = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  /* Persist preferences. Wrapped so a full quota never throws mid-update. */
  useEffect(() => {
    try {
      localStorage.setItem(KEYS.mode, themeMode);
      localStorage.setItem(KEYS.accent, accentColor);
      localStorage.setItem(KEYS.fontSize, fontSize);
      localStorage.setItem(KEYS.compact, String(compactSidebar));
      localStorage.setItem(KEYS.motion, String(reducedMotion));
      localStorage.setItem(KEYS.contrast, String(highContrast));
    } catch (err) {
      console.warn("Could not persist appearance settings:", err?.name || err);
    }
  }, [themeMode, accentColor, fontSize, compactSidebar, reducedMotion, highContrast]);

  /* Apply to the document root. */
  useEffect(() => {
    const root = document.documentElement;

    // "system" stamps nothing, so the prefers-color-scheme block in the
    // stylesheet can take over.
    if (themeMode === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themeMode);
    }

    const palette = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;
    const dark = DARK_ACCENTS[accentColor] || DARK_ACCENTS.indigo;
    const active = resolvedMode === "dark" ? { ...palette, ...dark } : palette;

    root.style.setProperty("--primary-accent", active.primary);
    root.style.setProperty("--primary-hover", active.hover);
    root.style.setProperty("--primary-light", active.light);
    root.style.setProperty("--primary-ring", active.ring);
    root.style.setProperty(
      "--primary-bg-subtle",
      `color-mix(in srgb, ${active.primary} 12%, transparent)`
    );

    root.style.setProperty("--base-font-size", FONT_SIZES[fontSize] || FONT_SIZES.medium);
    root.style.setProperty(
      "--sidebar-w",
      compactSidebar ? "var(--sidebar-w-compact)" : "260px"
    );

    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("reduced-motion", reducedMotion);
    root.classList.toggle("sidebar-compact", compactSidebar);
  }, [
    themeMode,
    resolvedMode,
    accentColor,
    fontSize,
    compactSidebar,
    reducedMotion,
    highContrast,
  ]);

  /**
   * Merge into the stored profile.
   *
   * The write happens here, not inside the state updater — updater functions
   * must be pure, and StrictMode double-invokes them in development.
   */
  const updateProfile = useCallback((patch) => {
    setUserProfile((prev) => {
      const next = { ...prev, ...patch };
      queueMicrotask(() => {
        if (!safeSet(KEYS.profile, next)) {
          console.warn(
            "Profile not saved — local storage is full. A large avatar image is the usual cause."
          );
        }
      });
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setUserProfile(DEFAULT_PROFILE);
    queueMicrotask(() => safeSet(KEYS.profile, DEFAULT_PROFILE));
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      resolvedMode,
      accentColor,
      setAccentColor,
      fontSize,
      setFontSize,
      compactSidebar,
      setCompactSidebar,
      reducedMotion,
      setReducedMotion,
      highContrast,
      setHighContrast,
      userProfile,
      updateProfile,
      resetProfile,
      ACCENT_COLORS,
    }),
    [
      themeMode,
      resolvedMode,
      accentColor,
      fontSize,
      compactSidebar,
      reducedMotion,
      highContrast,
      userProfile,
      updateProfile,
      resetProfile,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;
