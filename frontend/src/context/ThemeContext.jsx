import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ACCENT_COLORS = {
  indigo: { name: "Indigo", primary: "#6366f1", hover: "#4f46e5", light: "#e0e7ff", bg: "rgba(99, 102, 241, 0.15)" },
  emerald: { name: "Emerald", primary: "#10b981", hover: "#059669", light: "#d1fae5", bg: "rgba(16, 185, 129, 0.15)" },
  purple: { name: "Purple", primary: "#8b5cf6", hover: "#7c3aed", light: "#ede9fe", bg: "rgba(139, 92, 246, 0.15)" },
  amber: { name: "Amber", primary: "#f59e0b", hover: "#d97706", light: "#fef3c7", bg: "rgba(245, 158, 11, 0.15)" },
  rose: { name: "Rose", primary: "#f43f5e", hover: "#e11d48", light: "#ffe4e6", bg: "rgba(244, 63, 94, 0.15)" },
  cyan: { name: "Cyber Cyan", primary: "#06b6d4", hover: "#0891b2", light: "#cffaff", bg: "rgba(6, 182, 212, 0.15)" },
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("smartassess_theme_mode") || "dark";
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("smartassess_accent_color") || "indigo";
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("smartassess_font_size") || "medium";
  });

  const [compactSidebar, setCompactSidebar] = useState(() => {
    return localStorage.getItem("smartassess_compact_sidebar") === "true";
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem("smartassess_reduced_motion") === "true";
  });

  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("smartassess_high_contrast") === "true";
  });

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("smartassess_user_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: "Dr. Sarah Jenkins",
      email: "sarah.jenkins@smartassess.edu",
      role: "Lead Faculty & Administrator",
      department: "Computer Science & AI",
      phone: "+1 (555) 234-5678",
      bio: "Passionate educator & researcher specializing in Artificial Intelligence, Automated Evaluation Systems, and Machine Learning algorithms.",
      location: "San Francisco, CA",
      avatar: "", // empty defaults to initials avatar
    };
  });

  // Update localStorage and root CSS variables on changes
  useEffect(() => {
    localStorage.setItem("smartassess_theme_mode", themeMode);
    localStorage.setItem("smartassess_accent_color", accentColor);
    localStorage.setItem("smartassess_font_size", fontSize);
    localStorage.setItem("smartassess_compact_sidebar", compactSidebar);
    localStorage.setItem("smartassess_reduced_motion", reducedMotion);
    localStorage.setItem("smartassess_high_contrast", highContrast);

    const root = document.documentElement;

    // Handle Light/Dark Mode
    if (themeMode === "light") {
      root.setAttribute("data-theme", "light");
    } else if (themeMode === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      // System default
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", systemDark ? "dark" : "light");
    }

    // Apply Accent Color variables
    const accentObj = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;
    root.style.setProperty("--primary-accent", accentObj.primary);
    root.style.setProperty("--primary-hover", accentObj.hover);
    root.style.setProperty("--primary-light", accentObj.light);
    root.style.setProperty("--primary-bg-subtle", accentObj.bg);

    // Apply Font Size variable
    if (fontSize === "small") {
      root.style.setProperty("--base-font-size", "14px");
    } else if (fontSize === "large") {
      root.style.setProperty("--base-font-size", "18px");
    } else {
      root.style.setProperty("--base-font-size", "16px");
    }

    // Accessibility flags
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    if (reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }
  }, [themeMode, accentColor, fontSize, compactSidebar, reducedMotion, highContrast]);

  const updateProfile = (newProfile) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...newProfile };
      localStorage.setItem("smartassess_user_profile", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
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
        ACCENT_COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
