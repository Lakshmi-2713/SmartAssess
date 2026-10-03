import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUserGraduate,
  FaClipboardList,
  FaChartBar,
  FaSignOutAlt,
  FaTimes,
  FaGraduationCap,
  FaUser,
  FaUsersCog,
  FaChevronLeft,
} from "react-icons/fa";
import { useTheme } from "../context/useTheme";
import { getUser, clearSession } from "../services/session";
import { getInitials } from "../utils/format";
import "../styles/sidebar.css";

/**
 * Navigation is derived from the signed-in user's ROLE, not from the current
 * URL. Deriving it from the path meant a student who opened /tests was shown
 * the admin menu.
 */
const NAV_BY_ROLE = {
  faculty: [
    { to: "/faculty", label: "Faculty Dashboard", icon: <FaHome /> },
    { to: "/faculty?tab=create-test", label: "Create Assessment", icon: <FaClipboardList /> },
    { to: "/faculty?tab=manage-tests", label: "Manage Assessments", icon: <FaClipboardList /> },
    { to: "/faculty?tab=questions", label: "Question Management", icon: <FaClipboardList /> },
    { to: "/faculty?tab=ai-gen", label: "AI Question Gen", icon: <FaClipboardList /> },
    { to: "/faculty?tab=grading", label: "Evaluation & Grading", icon: <FaChartBar /> },
    { to: "/faculty?tab=results", label: "Results Management", icon: <FaChartBar /> },
    { to: "/faculty?tab=analytics", label: "Performance Analytics", icon: <FaChartBar /> },
    { to: "/students", label: "Student Roster", icon: <FaUserGraduate /> },
  ],
  student: [
    { to: "/student", label: "Student Dashboard", icon: <FaHome /> },
    { to: "/tests", label: "My Assessments", icon: <FaClipboardList /> },
    { to: "/results", label: "My Scorecard", icon: <FaChartBar /> },
  ],
  admin: [
    { to: "/admin", label: "Admin Overview", icon: <FaHome /> },
    { to: "/admin?tab=students", label: "Student Management", icon: <FaUserGraduate /> },
    { to: "/admin?tab=faculty", label: "Faculty Management", icon: <FaUsersCog /> },
    { to: "/admin?tab=users", label: "User & Role Mgmt", icon: <FaUsersCog /> },
    { to: "/admin?tab=assessments", label: "Assessment Mgmt", icon: <FaClipboardList /> },
    { to: "/admin?tab=results", label: "Results & Exports", icon: <FaChartBar /> },
    { to: "/admin?tab=ai-config", label: "AI Feature Mgmt", icon: <FaUsersCog /> },
    { to: "/admin?tab=monitoring", label: "Monitoring Logs", icon: <FaChartBar /> },
    { to: "/admin?tab=sys-settings", label: "System Settings", icon: <FaUsersCog /> },
  ],
};

const ROLE_LABEL = { faculty: "Faculty", student: "Student", admin: "Admin" };

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const { userProfile, compactSidebar, setCompactSidebar } = useTheme();

  // Safe read — a corrupt "user" value used to throw during render and
  // white-screen every authenticated page.
  const user = useMemo(() => getUser() || {}, []);

  const role = (user.role || userProfile?.role || "faculty").toLowerCase();
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.faculty;
  const roleLabel = ROLE_LABEL[role] || "Faculty";
  const toneClass = `tone-${role}`;

  const displayName = userProfile?.name || user.name || "SmartAssess User";
  const displayEmail = userProfile?.email || user.email || "";

  const closeMobile = () => setMobileOpen?.(false);

  const handleLogout = () => {
    // Actually end the session — previously this was a plain link to "/",
    // which left the token and profile in place.
    clearSession();
    closeMobile();
    navigate("/", { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-scrim" onClick={closeMobile} role="presentation" />
      )}

      <aside
        className={`sidebar ${toneClass} ${mobileOpen ? "is-open" : ""} ${
          compactSidebar ? "is-compact" : ""
        }`}
      >
        <div className="sidebar-head">
          <NavLink to={navItems[0].to} className="sidebar-brand" onClick={closeMobile}>
            <span className="sidebar-logo">
              <FaGraduationCap />
            </span>
            <span className="sidebar-brand-text">
              <strong>SmartAssess</strong>
              <em>{roleLabel} workspace</em>
            </span>
          </NavLink>

          <button
            className="sidebar-close"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-group">Main</p>
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "is-active" : ""}`
                  }
                  title={compactSidebar ? item.label : undefined}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="sidebar-group">Account</p>
          <ul>
            <li>
              <NavLink
                to="/settings"
                onClick={closeMobile}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "is-active" : ""}`
                }
                title={compactSidebar ? "Settings" : undefined}
              >
                <span className="sidebar-link-icon">
                  <FaUser />
                </span>
                <span className="sidebar-link-label">Profile &amp; Settings</span>
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                className="sidebar-link sidebar-logout"
                onClick={handleLogout}
                title={compactSidebar ? "Sign out" : undefined}
              >
                <span className="sidebar-link-icon">
                  <FaSignOutAlt />
                </span>
                <span className="sidebar-link-label">Sign out</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt=""
                className={`avatar avatar-${role}`}
              />
            ) : (
              <span className={`avatar avatar-${role}`}>{getInitials(displayName)}</span>
            )}
            <span className="sidebar-user-text">
              <strong className="truncate">{displayName}</strong>
              <em className="truncate">{displayEmail || roleLabel}</em>
            </span>
          </div>

          <button
            className="sidebar-collapse"
            onClick={() => setCompactSidebar(!compactSidebar)}
            aria-label={compactSidebar ? "Expand sidebar" : "Collapse sidebar"}
            title={compactSidebar ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FaChevronLeft />
          </button>
        </div>
      </aside>
    </>
  );
}
