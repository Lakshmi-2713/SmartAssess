import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBars,
  FaSun,
  FaMoon,
  FaBell,
  FaSearch,
  FaCog,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import "../styles/navbar.css";

function Navbar({ title = "Dashboard", subtitle = "Welcome back to SmartAssess Platform", onToggleMobileSidebar }) {
  const { themeMode, setThemeMode, userProfile } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleTheme = () => {
    if (themeMode === "dark") {
      setThemeMode("light");
    } else {
      setThemeMode("dark");
    }
  };

  const getInitials = (name) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleMobileSidebar && (
          <button
            className="mobile-menu-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
          >
            <FaBars />
          </button>
        )}
        <div className="navbar-heading">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="navbar-right">
        {/* Quick Search */}
        <div className="nav-search-bar">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search tests, students, courses..." />
        </div>

        {/* Theme Quick Switcher */}
        <button
          className="nav-icon-btn theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle Theme"
        >
          {themeMode === "dark" ? <FaSun className="icon-sun" /> : <FaMoon className="icon-moon" />}
        </button>

        {/* Notifications Popover */}
        <div className="nav-dropdown-wrapper">
          <button
            className="nav-icon-btn notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            title="Notifications"
            aria-label="Notifications"
          >
            <FaBell />
            <span className="notification-badge">3</span>
          </button>

          {showNotifications && (
            <div className="nav-dropdown-menu notification-menu">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <span className="badge-new">3 New</span>
              </div>
              <div className="dropdown-items">
                <div className="notification-item unread">
                  <div className="notif-dot"></div>
                  <div className="notif-content">
                    <p className="notif-title">New Test Submission</p>
                    <p className="notif-time">CS101 Java Basics • 5m ago</p>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notif-dot"></div>
                  <div className="notif-content">
                    <p className="notif-title">Scheduled Assessment</p>
                    <p className="notif-time">AI Fundamentals starts in 1h</p>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notif-dot"></div>
                  <div className="notif-content">
                    <p className="notif-title">System Alert</p>
                    <p className="notif-time">Proctoring report generated</p>
                  </div>
                </div>
              </div>
              <div className="dropdown-footer">
                <Link to="/settings" onClick={() => setShowNotifications(false)}>
                  Notification Preferences →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Dropdown Menu */}
        <div className="nav-dropdown-wrapper">
          <button
            className="nav-profile-btn"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            aria-label="User profile menu"
          >
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="nav-avatar-img"
              />
            ) : (
              <div className="nav-avatar-initials">
                {getInitials(userProfile?.name)}
              </div>
            )}
            <span className="nav-user-name">{userProfile?.name || "Admin"}</span>
          </button>

          {showProfileMenu && (
            <div className="nav-dropdown-menu profile-menu">
              <div className="profile-menu-header">
                <div className="profile-menu-info">
                  <strong>{userProfile?.name || "Dr. Sarah Jenkins"}</strong>
                  <span className="profile-email">{userProfile?.email || "sarah@smartassess.edu"}</span>
                </div>
              </div>
              <div className="profile-menu-divider" />
              <div className="dropdown-items">
                <Link
                  to="/settings"
                  className="menu-link"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <FaUser className="menu-icon" /> Profile & Account
                </Link>
                <Link
                  to="/settings"
                  className="menu-link"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <FaCog className="menu-icon" /> Appearance & Settings
                </Link>
                <div className="profile-menu-divider" />
                <Link
                  to="/"
                  className="menu-link logout-menu-link"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <FaSignOutAlt className="menu-icon" /> Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;