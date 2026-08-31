import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaTimes,
  FaGraduationCap,
  FaBell,
  FaBullhorn,
  FaUser,
  FaQuestionCircle,
  FaShieldAlt,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import "../styles/sidebar.css";

function Sidebar({ mobileOpen, setMobileOpen }) {
  const { userProfile } = useTheme();
  const location = useLocation();

  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = (storedUser.role || userProfile?.role || "faculty").toLowerCase();

  const isStudentView = location.pathname.startsWith("/student");
  const isFacultyView = location.pathname.startsWith("/faculty");
  const isAdminView = location.pathname.startsWith("/admin");

  const currentRoleName = isStudentView ? "Student" : isAdminView ? "Admin" : "Faculty";
  const roleBadgeClass = isStudentView ? "student-badge" : isAdminView ? "admin-badge" : "faculty-badge";

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
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
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${roleBadgeClass} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className={`logo-icon ${roleBadgeClass}`}>
              <FaGraduationCap />
            </div>
            <div>
              <h2>SmartAssess</h2>
              <span className={`role-workspace-tag ${roleBadgeClass}`}>
                {currentRoleName.toUpperCase()} MODULE
              </span>
            </div>
          </div>
          {setMobileOpen && (
            <button
              className="close-sidebar-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">MAIN MENU</div>
          <ul>
            {/* Faculty View Links */}
            {isFacultyView && (
              <>
                <li>
                  <NavLink
                    to="/faculty"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active faculty-active" : "nav-link")}
                  >
                    <FaHome className="nav-icon" /> <span>Faculty Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/tests"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active faculty-active" : "nav-link")}
                  >
                    <FaClipboardList className="nav-icon" /> <span>Test Management</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/results"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active faculty-active" : "nav-link")}
                  >
                    <FaChartBar className="nav-icon" /> <span>Results Analytics</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/students"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active faculty-active" : "nav-link")}
                  >
                    <FaUserGraduate className="nav-icon" /> <span>Students Management</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Student View Links */}
            {isStudentView && (
              <>
                <li>
                  <NavLink
                    to="/student"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active student-active" : "nav-link")}
                  >
                    <FaHome className="nav-icon" /> <span>Student Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/tests"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active student-active" : "nav-link")}
                  >
                    <FaClipboardList className="nav-icon" /> <span>My Assessments</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/results"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active student-active" : "nav-link")}
                  >
                    <FaChartBar className="nav-icon" /> <span>My Scorecard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/faculty"
                    onClick={handleNavClick}
                    className="nav-link"
                  >
                    <FaChalkboardTeacher className="nav-icon" /> <span>Faculty Portal</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Admin or General View Links */}
            {!isFacultyView && !isStudentView && (
              <>
                <li>
                  <NavLink
                    to="/admin"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active admin-active" : "nav-link")}
                  >
                    <FaHome className="nav-icon" /> <span>Admin Overview</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/student"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active student-active" : "nav-link")}
                  >
                    <FaUserGraduate className="nav-icon" /> <span>Student Portal</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/students"
                    onClick={handleNavClick}
                    className={({ isActive }) => (isActive ? "nav-link active admin-active" : "nav-link")}
                  >
                    <FaUserGraduate className="nav-icon" /> <span>Student Roster</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/faculty"
                    onClick={handleNavClick}
                    className="nav-link"
                  >
                    <FaChalkboardTeacher className="nav-icon" /> <span>Faculty Portal</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/tests"
                    onClick={handleNavClick}
                    className="nav-link"
                  >
                    <FaClipboardList className="nav-icon" /> <span>Tests Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/results"
                    onClick={handleNavClick}
                    className="nav-link"
                  >
                    <FaChartBar className="nav-icon" /> <span>Results Analytics</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <div className="nav-group-title">ACCOUNT PREFERENCES</div>
          <ul>
            <li>
              <NavLink
                to="/settings"
                onClick={handleNavClick}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <FaUser className="nav-icon" /> <span>Profile & Settings</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/" onClick={handleNavClick} className="nav-link logout-link">
                <FaSignOutAlt className="nav-icon" /> <span>Logout</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-card">
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="user-mini-avatar"
              />
            ) : (
              <div className={`user-mini-initials ${roleBadgeClass}`}>
                {getInitials(userProfile?.name || storedUser.name || (isStudentView ? "Rahul Verma" : "Dr. Johnson"))}
              </div>
            )}
            <div className="user-mini-info">
              <span className="user-mini-name">
                {userProfile?.name || storedUser.name || (isStudentView ? "Rahul Verma" : "Dr. Johnson")}
              </span>
              <span className={`user-mini-role-tag ${roleBadgeClass}`}>
                {currentRoleName}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;