import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaSun,
  FaMoon,
  FaDesktop,
  FaBell,
  FaCog,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import { useTheme } from "../context/useTheme";
import { getUser, clearSession } from "../services/session";
import { getInitials } from "../utils/format";
import "../styles/navbar.css";

const NOTIFICATIONS = [
  { id: 1, title: "New test submission", meta: "Data Structures · 5m ago", unread: true },
  { id: 2, title: "Scheduled assessment", meta: "Java Fundamentals starts in 1h", unread: true },
  { id: 3, title: "Proctoring report ready", meta: "Operating Systems · 2h ago", unread: false },
];

const THEME_CYCLE = ["light", "dark", "system"];
const THEME_ICON = { light: <FaSun />, dark: <FaMoon />, system: <FaDesktop /> };
const THEME_LABEL = { light: "Light", dark: "Dark", system: "System" };

/** Closes a popover when the user clicks outside it or presses Escape. */
function useDismiss(ref, onDismiss, active) {
  useEffect(() => {
    if (!active) return undefined;

    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onDismiss();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onDismiss, active]);
}

export default function Navbar({
  title = "Dashboard",
  subtitle,
  onToggleMobileSidebar,
  actions,
}) {
  const navigate = useNavigate();
  const { themeMode, setThemeMode, userProfile } = useTheme();

  const [openMenu, setOpenMenu] = useState(null); // "bell" | "profile" | null
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  useDismiss(bellRef, () => setOpenMenu(null), openMenu === "bell");
  useDismiss(profileRef, () => setOpenMenu(null), openMenu === "profile");

  const user = getUser() || {};
  const role = (user.role || userProfile?.role || "faculty").toLowerCase();
  const name = userProfile?.name || user.name || "SmartAssess User";
  const email = userProfile?.email || user.email || "";

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(themeMode);
    setThemeMode(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const handleLogout = () => {
    clearSession();
    setOpenMenu(null);
    navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleMobileSidebar && (
          <button
            className="navbar-burger"
            onClick={onToggleMobileSidebar}
            aria-label="Open navigation"
          >
            <FaBars />
          </button>
        )}
        <div className="navbar-heading">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="navbar-right">
        {actions}

        <button
          className="navbar-icon-btn"
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABEL[themeMode] || "System"} — click to change`}
          aria-label={`Theme: ${THEME_LABEL[themeMode] || "System"}. Click to change.`}
        >
          {THEME_ICON[themeMode] || <FaDesktop />}
        </button>

        {/* Notifications */}
        <div className="navbar-pop" ref={bellRef}>
          <button
            className="navbar-icon-btn"
            onClick={() => setOpenMenu(openMenu === "bell" ? null : "bell")}
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-expanded={openMenu === "bell"}
          >
            <FaBell />
            {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
          </button>

          {openMenu === "bell" && (
            <div className="navbar-menu" role="menu">
              <div className="navbar-menu-head">
                <strong>Notifications</strong>
                <span className="badge badge-primary">{unreadCount} new</span>
              </div>
              <ul className="navbar-notif-list">
                {NOTIFICATIONS.map((n) => (
                  <li key={n.id} className={n.unread ? "is-unread" : ""}>
                    <span className="navbar-notif-dot" aria-hidden="true" />
                    <div>
                      <strong>{n.title}</strong>
                      <span>{n.meta}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/settings"
                className="navbar-menu-foot"
                onClick={() => setOpenMenu(null)}
              >
                Notification preferences →
              </Link>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="navbar-pop" ref={profileRef}>
          <button
            className="navbar-profile-btn"
            onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
            aria-label="Account menu"
            aria-expanded={openMenu === "profile"}
          >
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="" className={`avatar avatar-sm avatar-${role}`} />
            ) : (
              <span className={`avatar avatar-sm avatar-${role}`}>{getInitials(name)}</span>
            )}
            <span className="navbar-profile-name truncate">{name}</span>
          </button>

          {openMenu === "profile" && (
            <div className="navbar-menu navbar-menu-right" role="menu">
              <div className="navbar-menu-user">
                {userProfile?.avatar ? (
                  <img src={userProfile.avatar} alt="" className={`avatar avatar-${role}`} />
                ) : (
                  <span className={`avatar avatar-${role}`}>{getInitials(name)}</span>
                )}
                <div className="truncate">
                  <strong className="truncate">{name}</strong>
                  <span className="truncate">{email}</span>
                </div>
              </div>
              <div className="divider" />
              <Link to="/settings" className="navbar-menu-link" onClick={() => setOpenMenu(null)}>
                <FaUser /> Profile &amp; account
              </Link>
              <Link to="/settings" className="navbar-menu-link" onClick={() => setOpenMenu(null)}>
                <FaCog /> Appearance
              </Link>
              <div className="divider" />
              <button className="navbar-menu-link is-danger" onClick={handleLogout}>
                <FaSignOutAlt /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
