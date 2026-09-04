import { useState, useRef } from "react";
import {
  FaUser,
  FaLock,
  FaBell,
  FaPalette,
  FaCheckCircle,
  FaSun,
  FaMoon,
  FaDesktop,
  FaCamera,
  FaTrashAlt,
  FaUniversalAccess,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { getInitials } from "../utils/format";
import { useToasts } from "../hooks/useToasts";
import { useTheme } from "../context/useTheme";
import { ACCENT_COLORS } from "../context/themeTokens";
import { getUser } from "../services/session";
import "../styles/settings.css";

const TABS = [
  { key: "profile", label: "Profile", icon: <FaUser /> },
  { key: "appearance", label: "Appearance", icon: <FaPalette /> },
  { key: "accessibility", label: "Accessibility", icon: <FaUniversalAccess /> },
  { key: "notifications", label: "Notifications", icon: <FaBell /> },
  { key: "security", label: "Security", icon: <FaLock /> },
];

const THEME_MODES = [
  { key: "light", label: "Light", icon: <FaSun /> },
  { key: "dark", label: "Dark", icon: <FaMoon /> },
  { key: "system", label: "System", icon: <FaDesktop /> },
];

const FONT_SIZES = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Default" },
  { key: "large", label: "Large" },
];

// localStorage tops out around 5 MB; a raw photo blows straight past it.
const MAX_AVATAR_BYTES = 512 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function Settings() {
  const toasts = useToasts();
  const fileRef = useRef(null);

  const {
    themeMode, setThemeMode,
    accentColor, setAccentColor,
    fontSize, setFontSize,
    compactSidebar, setCompactSidebar,
    reducedMotion, setReducedMotion,
    highContrast, setHighContrast,
    userProfile, updateProfile,
  } = useTheme();

  const sessionUser = getUser() || {};

  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState("profile");

  const [form, setForm] = useState({
    name: userProfile?.name || sessionUser.name || "",
    email: userProfile?.email || sessionUser.email || "",
    phone: userProfile?.phone || "",
    department: userProfile?.department || sessionUser.department || "",
    location: userProfile?.location || "",
    bio: userProfile?.bio || "",
    avatar: userProfile?.avatar || "",
  });
  const [dirty, setDirty] = useState(false);

  /**
   * Re-sync when the stored profile changes underneath us (a save, or another
   * tab). This is React's documented "adjust state during render" pattern
   * rather than an effect: it runs before the browser paints and does not
   * trigger a second render pass. Unsaved edits are never clobbered.
   */
  const [seenProfile, setSeenProfile] = useState(userProfile);
  if (userProfile !== seenProfile) {
    setSeenProfile(userProfile);
    if (!dirty) {
      setForm({
        name: userProfile?.name || sessionUser.name || "",
        email: userProfile?.email || sessionUser.email || "",
        phone: userProfile?.phone || "",
        department: userProfile?.department || sessionUser.department || "",
        location: userProfile?.location || "",
        bio: userProfile?.bio || "",
        avatar: userProfile?.avatar || "",
      });
    }
  }

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toasts.error("Name cannot be empty.");
      return;
    }
    updateProfile({ ...form, name: form.name.trim() });
    setDirty(false);
    toasts.success("Profile saved.");
  };

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      toasts.error("Choose a PNG, JPEG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toasts.error(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please use one under 512 KB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toasts.error("Could not read that image file.");
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, avatar: String(ev.target?.result || "") }));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: "" }));
    setDirty(true);
  };

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Settings"
          subtitle="Profile, appearance and preferences"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          <div className="page-head">
            <div className="page-head-title">
              <span className="page-head-icon"><FaUser /></span>
              <div>
                <h2 className="page-title">Settings</h2>
                <p className="page-subtitle">Manage your account and how the app looks</p>
              </div>
            </div>
          </div>

          <div className="settings-layout">
            <nav className="settings-nav" aria-label="Settings sections">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`settings-nav-btn ${tab === t.key ? "is-active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="settings-panel card">
              {/* ── Profile ─────────────────────────────────── */}
              {tab === "profile" && (
                <form onSubmit={handleSave} noValidate>
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaUser className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Profile</h3>
                        <p className="card-subtitle">How you appear across SmartAssess</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-body stack">
                    <div className="avatar-editor">
                      {form.avatar ? (
                        <img src={form.avatar} alt="" className="avatar avatar-xl" />
                      ) : (
                        <span className="avatar avatar-xl">{getInitials(form.name)}</span>
                      )}
                      <div className="avatar-editor-actions">
                        <p className="field-hint">
                          PNG, JPEG, WebP or GIF. Maximum 512&nbsp;KB.
                        </p>
                        <div className="row">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => fileRef.current?.click()}
                          >
                            <FaCamera /> Upload
                          </button>
                          {form.avatar && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={removeAvatar}
                            >
                              <FaTrashAlt /> Remove
                            </button>
                          )}
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept={AVATAR_TYPES.join(",")}
                          onChange={handleAvatar}
                          className="sr-only"
                          aria-label="Upload profile photo"
                        />
                      </div>
                    </div>

                    <div className="divider" />

                    <div className="form-grid">
                      <div className="field">
                        <label className="field-label">Full name <span className="req">*</span></label>
                        <input className="input" name="name" value={form.name} onChange={setField} required />
                      </div>
                      <div className="field">
                        <label className="field-label">Email</label>
                        <input className="input" name="email" type="email" value={form.email} onChange={setField} />
                      </div>
                      <div className="field">
                        <label className="field-label">Phone</label>
                        <input className="input" name="phone" value={form.phone} onChange={setField} placeholder="+91 98765 43210" />
                      </div>
                      <div className="field">
                        <label className="field-label">Department</label>
                        <input className="input" name="department" value={form.department} onChange={setField} />
                      </div>
                      <div className="field">
                        <label className="field-label">Location</label>
                        <input className="input" name="location" value={form.location} onChange={setField} />
                      </div>
                      <div className="field">
                        <label className="field-label">Role</label>
                        <input className="input" value={sessionUser.role || "—"} disabled />
                        <span className="field-hint">Roles are assigned by an administrator.</span>
                      </div>
                      <div className="field form-row-full">
                        <label className="field-label">Bio</label>
                        <textarea className="textarea" name="bio" rows="3" value={form.bio} onChange={setField} />
                      </div>
                    </div>
                  </div>

                  <div className="card-foot row-between">
                    <span className="text-xs text-muted">
                      {dirty ? "You have unsaved changes." : "All changes saved."}
                    </span>
                    <button type="submit" className="btn btn-primary" disabled={!dirty}>
                      <FaCheckCircle /> Save changes
                    </button>
                  </div>
                </form>
              )}

              {/* ── Appearance ──────────────────────────────── */}
              {tab === "appearance" && (
                <>
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaPalette className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Appearance</h3>
                        <p className="card-subtitle">Theme, accent colour and density</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-body stack">
                    <section className="setting-block">
                      <h4>Theme</h4>
                      <p className="field-hint">
                        “System” follows your operating system and updates live.
                      </p>
                      <div className="option-row">
                        {THEME_MODES.map((m) => (
                          <button
                            key={m.key}
                            className={`option-card ${themeMode === m.key ? "is-active" : ""}`}
                            onClick={() => setThemeMode(m.key)}
                          >
                            <span className="option-icon">{m.icon}</span>
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="divider" />

                    <section className="setting-block">
                      <h4>Accent colour</h4>
                      <div className="swatch-row">
                        {Object.entries(ACCENT_COLORS).map(([key, c]) => (
                          <button
                            key={key}
                            className={`swatch ${accentColor === key ? "is-active" : ""}`}
                            style={{ "--swatch": c.primary }}
                            onClick={() => setAccentColor(key)}
                            title={c.name}
                            aria-label={`Accent colour: ${c.name}`}
                            aria-pressed={accentColor === key}
                          >
                            {accentColor === key && <FaCheckCircle />}
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="divider" />

                    <section className="setting-block">
                      <h4>Text size</h4>
                      <div className="option-row">
                        {FONT_SIZES.map((f) => (
                          <button
                            key={f.key}
                            className={`option-card ${fontSize === f.key ? "is-active" : ""}`}
                            onClick={() => setFontSize(f.key)}
                          >
                            <span
                              className="option-icon"
                              style={{
                                fontSize:
                                  f.key === "small" ? 13 : f.key === "large" ? 21 : 17,
                                fontWeight: 700,
                              }}
                            >
                              Aa
                            </span>
                            <span>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="divider" />

                    <ToggleRow
                      label="Compact sidebar"
                      hint="Collapse the sidebar to icons only."
                      checked={compactSidebar}
                      onChange={setCompactSidebar}
                    />
                  </div>
                </>
              )}

              {/* ── Accessibility ───────────────────────────── */}
              {tab === "accessibility" && (
                <>
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaUniversalAccess className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Accessibility</h3>
                        <p className="card-subtitle">Motion and contrast preferences</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body stack">
                    <ToggleRow
                      label="Reduce motion"
                      hint="Minimise animations and transitions throughout the app."
                      checked={reducedMotion}
                      onChange={setReducedMotion}
                    />
                    <div className="divider" />
                    <ToggleRow
                      label="High contrast"
                      hint="Strengthen borders and text contrast for better legibility."
                      checked={highContrast}
                      onChange={setHighContrast}
                    />
                  </div>
                </>
              )}

              {/* ── Notifications ───────────────────────────── */}
              {tab === "notifications" && (
                <>
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaBell className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Notifications</h3>
                        <p className="card-subtitle">Choose what you hear about</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body stack">
                    <NotificationRow label="New submissions" hint="When a student completes an assessment." />
                    <div className="divider" />
                    <NotificationRow label="Proctoring alerts" hint="When an integrity violation is flagged." />
                    <div className="divider" />
                    <NotificationRow label="Scheduled reminders" hint="An hour before a test goes live." />
                    <div className="divider" />
                    <NotificationRow label="Weekly digest" hint="A Monday summary of cohort performance." defaultOn={false} />
                  </div>
                </>
              )}

              {/* ── Security ────────────────────────────────── */}
              {tab === "security" && (
                <>
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaLock className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Security</h3>
                        <p className="card-subtitle">Password and session</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body stack">
                    <div className="alert alert-info">
                      <FaLock />
                      <div className="alert-body">
                        <div className="alert-title">Password changes are not yet wired up</div>
                        <div>
                          This screen is a placeholder. Password updates need a
                          dedicated, authenticated API endpoint before they can be
                          offered here — ask your administrator to reset it for now.
                        </div>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label className="field-label">Current password</label>
                        <input className="input" type="password" disabled placeholder="••••••••" />
                      </div>
                      <div className="field">
                        <label className="field-label">New password</label>
                        <input className="input" type="password" disabled placeholder="••••••••" />
                      </div>
                    </div>
                    <div>
                      <button className="btn btn-primary" disabled>Update password</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <span className="field-hint">{hint}</span>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-track" />
        <span className="sr-only">{label}</span>
      </label>
    </div>
  );
}

function NotificationRow({ label, hint, defaultOn = true }) {
  const [on, setOn] = useState(defaultOn);
  return <ToggleRow label={label} hint={hint} checked={on} onChange={setOn} />;
}
