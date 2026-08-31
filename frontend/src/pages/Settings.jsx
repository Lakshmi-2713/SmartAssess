import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
  FaUser,
  FaLock,
  FaBell,
  FaPalette,
  FaCheckCircle,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import { useTheme, ACCENT_COLORS } from "../context/ThemeContext";
import "../styles/settings.css";

function Settings() {
  const {
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    userProfile,
    updateProfile,
  } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("profile"); // profile, password, notifications, appearance

  // Form State
  const [fullName, setFullName] = useState(userProfile?.name || "Rahul Verma");
  const [email, setEmail] = useState(userProfile?.email || "rahul.verma@student.com");
  const [phone, setPhone] = useState(userProfile?.phone || "9876543210");
  const [department, setDepartment] = useState(userProfile?.department || "Computer Science");
  const [semester, setSemester] = useState("4th Semester");
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar || "");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || "Rahul Verma");
      setEmail(userProfile.email || "rahul.verma@student.com");
      setPhone(userProfile.phone || "9876543210");
      setDepartment(userProfile.department || "Computer Science");
      setAvatarUrl(userProfile.avatar || "");
    }
  }, [userProfile]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      name: fullName,
      email,
      phone,
      department,
      avatar: avatarUrl,
    });
    setSavedMsg("Profile changes saved successfully!");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAvatarUrl(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="settings-layout-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="settings-main-content">
        <Navbar
          title="Settings"
          subtitle="Manage your account settings"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="settings-dashboard-body">
          {/* Header */}
          <div className="settings-top-header">
            <h2 className="settings-title">Settings</h2>
            <p className="settings-sub">Manage your account settings</p>
          </div>

          {savedMsg && (
            <div className="settings-alert-success">
              <FaCheckCircle /> {savedMsg}
            </div>
          )}

          {/* Sub Navigation & Form Grid */}
          <div className="settings-content-grid">
            {/* Left Sub Nav */}
            <div className="settings-sub-nav">
              <button
                className={`sub-nav-btn ${activeSubTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveSubTab("profile")}
              >
                <FaUser /> Profile Settings
              </button>
              <button
                className={`sub-nav-btn ${activeSubTab === "password" ? "active" : ""}`}
                onClick={() => setActiveSubTab("password")}
              >
                <FaLock /> Change Password
              </button>
              <button
                className={`sub-nav-btn ${activeSubTab === "notifications" ? "active" : ""}`}
                onClick={() => setActiveSubTab("notifications")}
              >
                <FaBell /> Notification Settings
              </button>
              <button
                className={`sub-nav-btn ${activeSubTab === "appearance" ? "active" : ""}`}
                onClick={() => setActiveSubTab("appearance")}
              >
                <FaPalette /> Appearance
              </button>
            </div>

            {/* Right Form Card */}
            <div className="settings-card-panel">
              {activeSubTab === "profile" && (
                <form onSubmit={handleSaveProfile} className="profile-settings-form">
                  <h3 className="panel-section-title">Profile Settings</h3>

                  <div className="form-input-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row-two-col">
                    <div className="form-input-group">
                      <label>Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option>Computer Science</option>
                        <option>Information Technology</option>
                        <option>Electronics</option>
                        <option>Mechanical</option>
                      </select>
                    </div>

                    <div className="form-input-group">
                      <label>Semester</label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                      >
                        <option>1st Semester</option>
                        <option>2nd Semester</option>
                        <option>3rd Semester</option>
                        <option>4th Semester</option>
                        <option>5th Semester</option>
                        <option>6th Semester</option>
                      </select>
                    </div>
                  </div>

                  {/* Profile Picture Section */}
                  <div className="profile-picture-section">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                    <div className="avatar-flex-row">
                      <img src={avatarUrl} alt="Avatar Preview" className="avatar-preview-img" />
                      <div className="avatar-action-btns">
                        <label className="btn-change-photo">
                          Change Photo
                          <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                        </label>
                        <button
                          type="button"
                          className="btn-remove-photo"
                          onClick={() => setAvatarUrl("https://via.placeholder.com/150")}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-submit-row">
                    <button type="submit" className="btn-save-changes-blue">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {activeSubTab === "password" && (
                <div className="tab-pane-content">
                  <h3 className="panel-section-title">Change Password</h3>
                  <form onSubmit={(e) => { e.preventDefault(); setSavedMsg("Password updated successfully!"); setTimeout(() => setSavedMsg(""), 3000); }}>
                    <div className="form-input-group">
                      <label>Current Password</label>
                      <input type="password" placeholder="••••••••" required />
                    </div>
                    <div className="form-input-group">
                      <label>New Password</label>
                      <input type="password" placeholder="••••••••" required minLength="6" />
                    </div>
                    <div className="form-input-group">
                      <label>Confirm New Password</label>
                      <input type="password" placeholder="••••••••" required minLength="6" />
                    </div>
                    <div className="form-submit-row mt-4">
                      <button type="submit" className="btn-save-changes-blue">Update Password</button>
                    </div>
                  </form>
                </div>
              )}

              {activeSubTab === "notifications" && (
                <div className="tab-pane-content">
                  <h3 className="panel-section-title">Notification Settings</h3>
                  <div className="checkbox-setting-item mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked /> Email alerts for upcoming scheduled tests
                    </label>
                  </div>
                  <div className="checkbox-setting-item mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked /> Result and scorecard evaluation notifications
                    </label>
                  </div>
                  <div className="checkbox-setting-item mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked /> Proctoring security log summaries
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === "appearance" && (
                <div className="tab-pane-content">
                  <h3 className="panel-section-title">Appearance & Theme Preferences</h3>
                  <p className="text-sm text-slate-400 mt-1 mb-4">Choose your preferred visual mode and platform accent color.</p>

                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Theme Mode</label>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                    <button
                      type="button"
                      className={`sub-nav-btn ${themeMode === "dark" ? "active" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setThemeMode("dark")}
                    >
                      <FaMoon /> Dark Mode
                    </button>
                    <button
                      type="button"
                      className={`sub-nav-btn ${themeMode === "light" ? "active" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setThemeMode("light")}
                    >
                      <FaSun /> Light Mode
                    </button>
                  </div>

                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Primary Accent Color</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                    {Object.entries(ACCENT_COLORS).map(([key, col]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccentColor(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: accentColor === key ? `2px solid ${col.primary}` : "1px solid var(--border-color)",
                          background: accentColor === key ? col.bg : "var(--bg-card)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: col.primary, display: "inline-block" }} />
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
