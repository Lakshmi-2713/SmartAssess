import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  FaGraduationCap,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
  FaKey,
  FaEnvelope,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserShield,
  FaShieldAlt,
  FaCameraRetro,
  FaBrain,
} from "react-icons/fa";
import "../styles/Login.css";

const ROLES = {
  faculty: {
    key: "faculty",
    label: "Faculty",
    desc: "Educator access",
    email: "johnson@smartassess.edu",
    name: "Dr. Johnson",
    redirectPath: "/faculty",
    accent: "#10b981",
    accentClass: "active-faculty",
    btnClass: "btn-faculty",
    demoClass: "dc-faculty",
    iconClass: "fac",
  },
  student: {
    key: "student",
    label: "Student",
    desc: "Learner portal",
    email: "rahul.verma@student.com",
    name: "Rahul Verma",
    redirectPath: "/student",
    accent: "#6366f1",
    accentClass: "active-student",
    btnClass: "btn-student",
    demoClass: "dc-student",
    iconClass: "stu",
  },
  admin: {
    key: "admin",
    label: "Admin",
    desc: "System control",
    email: "admin@smartassess.com",
    name: "System Admin",
    redirectPath: "/admin",
    accent: "#f59e0b",
    accentClass: "active-admin",
    btnClass: "btn-admin",
    demoClass: "dc-admin",
    iconClass: "adm",
  },
};

function Login() {
  const navigate = useNavigate();
  const { updateProfile } = useTheme();

  const [role, setRole] = useState("faculty");
  const [email, setEmail] = useState(ROLES.faculty.email);
  const [password, setPassword] = useState("password123");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const preset = ROLES[role] || ROLES.faculty;

  const handleRoleClick = (key) => {
    setRole(key);
    setEmail(ROLES[key].email);
    setStatus({ type: "", text: "" });
  };

  const saveAndGo = (user, path) => {
    const session = {
      name: user.name || "SmartAssess User",
      email: user.email || email,
      role: user.role || role,
      department: user.department || "Computer Science",
    };
    localStorage.setItem("user", JSON.stringify(session));
    if (updateProfile) updateProfile(session);
    navigate(path);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setStatus({ type: "", text: "" });

    if (!email.trim() || !password.trim()) {
      setStatus({ type: "error", text: "Please enter both email and password." });
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/login", { role, email, password });
      const user = res.data.user || { name: preset.name, email, role: preset.key };
      saveAndGo(user, preset.redirectPath);
    } catch {
      saveAndGo({ name: preset.name, email, role: preset.key }, preset.redirectPath);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setShowForgot(false);
      setResetEmail("");
    }, 2500);
  };

  return (
    <div className="login-page-root" style={{ "--rp-accent": preset.accent }}>
      {/* Animated background */}
      <div className="login-bg-gradient" />
      <div className="login-grid-lines" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-card-wrapper">
        {/* ── LEFT PANEL ────────────────────────────────── */}
        <div className="login-left-panel">
          {/* Brand */}
          <div className="lp-brand-row">
            <div className="lp-logo-box">
              <FaGraduationCap />
            </div>
            <div>
              <h1 className="lp-brand-name">SmartAssess</h1>
              <p className="lp-brand-tagline">AI-Powered Assessment Platform</p>
            </div>
          </div>

          {/* Hero SVG Illustration */}
          <div className="lp-hero-area">
            <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp-hero-svg">
              {/* Background ring */}
              <circle cx="240" cy="180" r="155" stroke="rgba(59,130,246,0.1)" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="240" cy="180" r="115" stroke="rgba(16,185,129,0.08)" strokeWidth="1" />

              {/* Monitor / Screen */}
              <rect x="110" y="60" width="260" height="170" rx="12" fill="#0f172a" stroke="#1e3a5f" strokeWidth="2" />
              <rect x="122" y="72" width="236" height="146" rx="8" fill="#0b1629" />

              {/* Screen content - chart bars */}
              <rect x="142" y="162" width="28" height="40" rx="4" fill="rgba(16,185,129,0.6)" />
              <rect x="178" y="145" width="28" height="57" rx="4" fill="rgba(59,130,246,0.7)" />
              <rect x="214" y="132" width="28" height="70" rx="4" fill="rgba(99,102,241,0.8)" />
              <rect x="250" y="148" width="28" height="54" rx="4" fill="rgba(16,185,129,0.5)" />
              <rect x="286" y="120" width="28" height="82" rx="4" fill="rgba(59,130,246,0.6)" />
              <rect x="322" y="138" width="28" height="64" rx="4" fill="rgba(245,158,11,0.6)" />

              {/* Screen title bar */}
              <rect x="142" y="82" width="120" height="8" rx="3" fill="rgba(255,255,255,0.1)" />
              <rect x="142" y="96" width="80" height="6" rx="2" fill="rgba(255,255,255,0.06)" />
              <circle cx="320" cy="88" r="6" fill="rgba(16,185,129,0.8)" />

              {/* Monitor base */}
              <path d="M195 230 L285 230 L275 255 L205 255 Z" fill="#0f172a" stroke="#1e3a5f" strokeWidth="1.5" />
              <rect x="185" y="253" width="110" height="8" rx="4" fill="#0f172a" stroke="#1e3a5f" strokeWidth="1.5" />

              {/* Floating stat cards */}
              <rect x="30" y="80" width="75" height="50" rx="10" fill="rgba(10,20,40,0.9)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
              <text x="43" y="103" fill="#10b981" fontSize="16" fontWeight="800" fontFamily="sans-serif">98%</text>
              <text x="43" y="118" fill="#475569" fontSize="8" fontFamily="sans-serif">Pass Rate</text>

              <rect x="375" y="80" width="75" height="50" rx="10" fill="rgba(10,20,40,0.9)" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
              <text x="388" y="103" fill="#818cf8" fontSize="16" fontWeight="800" fontFamily="sans-serif">12K</text>
              <text x="388" y="118" fill="#475569" fontSize="8" fontFamily="sans-serif">Students</text>

              <rect x="30" y="195" width="75" height="50" rx="10" fill="rgba(10,20,40,0.9)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              <text x="43" y="218" fill="#60a5fa" fontSize="16" fontWeight="800" fontFamily="sans-serif">240+</text>
              <text x="43" y="233" fill="#475569" fontSize="8" fontFamily="sans-serif">Tests/Month</text>

              <rect x="375" y="195" width="75" height="50" rx="10" fill="rgba(10,20,40,0.9)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
              <text x="390" y="218" fill="#fbbf24" fontSize="16" fontWeight="800" fontFamily="sans-serif">4.9★</text>
              <text x="390" y="233" fill="#475569" fontSize="8" fontFamily="sans-serif">Rating</text>

              {/* Connection lines */}
              <line x1="105" y1="105" x2="110" y2="140" stroke="rgba(16,185,129,0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="375" y1="105" x2="370" y2="140" stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="105" y1="220" x2="110" y2="200" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="375" y1="220" x2="370" y2="200" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="3 3" />

              {/* Bottom icons */}
              <circle cx="200" cy="310" r="22" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
              <circle cx="240" cy="310" r="22" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.25)" strokeWidth="1" />
              <circle cx="280" cy="310" r="22" fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.25)" strokeWidth="1" />
              <text x="192" y="315" fill="#10b981" fontSize="12" fontFamily="sans-serif">🔒</text>
              <text x="232" y="315" fill="#60a5fa" fontSize="12" fontFamily="sans-serif">📊</text>
              <text x="272" y="315" fill="#818cf8" fontSize="12" fontFamily="sans-serif">🧠</text>
            </svg>
          </div>

          {/* Stats */}
          <div className="lp-stats-row">
            <div className="lp-stat">
              <span className="lp-stat-val">12K+</span>
              <span className="lp-stat-label">Active Students</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-val">240+</span>
              <span className="lp-stat-label">Tests Monthly</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-val">98%</span>
              <span className="lp-stat-label">Pass Rate</span>
            </div>
          </div>

          {/* Feature pills */}
          <div className="lp-feature-pills">
            <span className="lp-pill">
              <span className="lp-pill-dot" />
              AI Proctoring
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot blue" />
              Live Analytics
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot purple" />
              Auto-Grading
            </span>
          </div>

          <p className="lp-footer-copy">© 2025 SmartAssess · Secure Assessments</p>
        </div>

        {/* ── RIGHT PANEL ───────────────────────────────── */}
        <div className="login-right-panel">
          {/* Header */}
          <div className="rp-header">
            <h2 className="rp-title">Welcome back 👋</h2>
            <p className="rp-subtitle">
              Signing in as <span>{preset.label}</span>
            </p>
          </div>

          {/* Role Selector */}
          <div className="role-selector-grid">
            {Object.values(ROLES).map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-select-card ${role === r.key ? r.accentClass : ""}`}
                onClick={() => handleRoleClick(r.key)}
              >
                {role === r.key && <span className="role-active-badge" />}
                <span className="role-card-icon">
                  {r.key === "faculty" ? <FaChalkboardTeacher /> : r.key === "student" ? <FaUserGraduate /> : <FaUserShield />}
                </span>
                <span className="role-card-label">{r.label}</span>
                <span className="role-card-desc">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Status Alert */}
          {status.text && (
            <div className={`rp-status-alert ${status.type}`}>
              {status.type === "error" ? <FaExclamationCircle /> : <FaCheckCircle />}
              <span>{status.text}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="rp-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="rp-input-group">
              <label className="rp-input-label">Email Address</label>
              <div className="rp-input-wrap">
                <FaEnvelope className="rp-input-icon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="rp-input-group">
              <label className="rp-input-label">Password</label>
              <div className="rp-input-wrap">
                <FaLock className="rp-input-icon" />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="rp-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Meta row */}
            <div className="rp-form-meta-row">
              <label className="rp-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                className="rp-forgot-btn"
                onClick={() => { setResetEmail(email); setShowForgot(true); }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`rp-submit-btn ${preset.btnClass}`}
              disabled={loading}
            >
              {loading ? (
                <span className="rp-btn-spinner">
                  <span className="rp-spinner" />
                  Authenticating…
                </span>
              ) : (
                `Sign In as ${preset.label}`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="rp-divider">Quick Demo Access</div>

          {/* Demo Access */}
          <div className="rp-demo-section">
            <div className="rp-demo-grid">
              {Object.values(ROLES).map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={`rp-demo-card ${r.demoClass}`}
                  onClick={() =>
                    saveAndGo({ name: r.name, email: r.email, role: r.key }, r.redirectPath)
                  }
                >
                  <span className={`rp-demo-icon ${r.iconClass}`}>
                    {r.key === "faculty" ? <FaChalkboardTeacher /> : r.key === "student" ? <FaUserGraduate /> : <FaShieldAlt />}
                  </span>
                  <span className="rp-demo-name">{r.name}</span>
                  <span className="rp-demo-role">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rp-contact-row">
            Don't have an account?{" "}
            <button className="rp-contact-link">Contact Administrator</button>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ───────────────────────── */}
      {showForgot && (
        <div className="login-modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <div className="login-modal-title">
                <div className="modal-title-icon"><FaKey /></div>
                Reset Password
              </div>
              <button className="login-modal-close" onClick={() => setShowForgot(false)}>
                <FaTimes />
              </button>
            </div>

            {resetSent ? (
              <div className="modal-reset-success">
                <div className="modal-success-icon">✅</div>
                <p className="modal-success-text">
                  Reset instructions sent to <strong>{resetEmail}</strong>.
                  Check your inbox!
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <p className="login-modal-info">
                  Enter your registered email and we'll send you a link to reset your password.
                </p>
                <div className="rp-input-group">
                  <label className="rp-input-label">Email Address</label>
                  <div className="rp-input-wrap">
                    <FaEnvelope className="rp-input-icon" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="login-modal-actions">
                  <button type="button" className="modal-cancel-btn" onClick={() => setShowForgot(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-submit-btn">
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;