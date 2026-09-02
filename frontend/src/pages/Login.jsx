import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaGraduationCap,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimes,
  FaKey,
  FaEnvelope,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserShield,
  FaShieldAlt,
  FaChartLine,
  FaBolt,
} from "react-icons/fa";
import API from "../services/api";
import { saveSession, isAuthenticated, getUser, homePathFor } from "../services/session";
import { useTheme } from "../context/useTheme";
import "../styles/Login.css";

const ROLES = [
  {
    key: "faculty",
    label: "Faculty",
    desc: "Create & evaluate",
    icon: <FaChalkboardTeacher />,
    tone: "faculty",
  },
  {
    key: "student",
    label: "Student",
    desc: "Take assessments",
    icon: <FaUserGraduate />,
    tone: "student",
  },
  {
    key: "admin",
    label: "Admin",
    desc: "System control",
    icon: <FaUserShield />,
    tone: "admin",
  },
];

const HIGHLIGHTS = [
  { icon: <FaShieldAlt />, title: "AI proctoring", text: "Live face and multi-person detection during every exam." },
  { icon: <FaChartLine />, title: "Instant analytics", text: "Cohort performance and per-question breakdowns as results land." },
  { icon: <FaBolt />, title: "Automated grading", text: "Objective sections score themselves; faculty review the rest." },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateProfile } = useTheme();

  const [role, setRole] = useState("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser();
      navigate(homePathFor(user?.role), { replace: true });
    }
  }, [navigate]);

  const activeRole = ROLES.find((r) => r.key === role) || ROLES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setStatus({ type: "error", text: "Enter both your email and password." });
      return;
    }

    setLoading(true);
    try {
      // The role chip is a UI affordance, not an auth factor — filtering the
      // lookup by it added no security while rejecting correct credentials
      // whenever the chip was left on the wrong role. The server returns the
      // account's real role and we route by that.
      const res = await API.post("/auth/login", {
        email: trimmedEmail,
        password,
      });

      const { token, user } = res.data || {};
      if (!token || !user) {
        // A 200 without credentials is a server contract violation, not a login.
        throw new Error("The server did not return a valid session.");
      }

      saveSession({ token, user });
      updateProfile({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
      });

      const from = location.state?.from;
      navigate(from && from !== "/" ? from : homePathFor(user.role), { replace: true });
      return;
    } catch (err) {
      // A failed sign-in must never fall through to a granted session.
      setStatus({
        type: "error",
        text: err.userMessage || err.message || "Sign in failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSent(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setResetSent(false);
    setResetEmail("");
  };

  return (
    <div className={`login-root tone-${activeRole.tone}`}>
      <div className="login-bg" aria-hidden="true">
        <span className="login-glow login-glow-a" />
        <span className="login-glow login-glow-b" />
        <span className="login-grid" />
      </div>

      <div className="login-shell">
        {/* ── Brand panel ─────────────────────────────────────── */}
        <aside className="login-brand">
          <div className="login-brand-top">
            <div className="login-logo">
              <FaGraduationCap />
            </div>
            <div>
              <p className="login-wordmark">SmartAssess</p>
              <p className="login-tagline">AI-proctored assessment platform</p>
            </div>
          </div>

          <div className="login-brand-mid">
            <h1 className="login-headline">
              Run exams you can <span>actually trust</span>.
            </h1>
            <p className="login-blurb">
              Identity checks, live invigilation and automated scoring in one
              place — so your team spends time on teaching, not policing.
            </p>

            <ul className="login-highlights">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title}>
                  <span className="lh-icon">{h.icon}</span>
                  <div>
                    <strong>{h.title}</strong>
                    <span>{h.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="login-brand-foot">
            <div className="login-metrics">
              <div>
                <strong>12k+</strong>
                <span>Active students</span>
              </div>
              <div>
                <strong>240+</strong>
                <span>Tests / month</span>
              </div>
              <div>
                <strong>99.4%</strong>
                <span>Integrity rate</span>
              </div>
            </div>
            <p className="login-copyright">© 2025 SmartAssess</p>
          </div>
        </aside>

        {/* ── Form panel ──────────────────────────────────────── */}
        <main className="login-panel">
          <div className="login-panel-inner">
            <header className="login-panel-head">
              <h2>Welcome back</h2>
              <p>Sign in to your {activeRole.label.toLowerCase()} workspace.</p>
            </header>

            <p className="role-picker-hint">
              You&apos;ll be taken to the workspace your account belongs to.
            </p>

            <div className="role-picker" role="radiogroup" aria-label="Select your role">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={role === r.key}
                  className={`role-chip tone-${r.tone} ${role === r.key ? "is-active" : ""}`}
                  onClick={() => {
                    setRole(r.key);
                    setStatus({ type: "", text: "" });
                  }}
                >
                  <span className="role-chip-icon">{r.icon}</span>
                  <span className="role-chip-label">{r.label}</span>
                  <span className="role-chip-desc">{r.desc}</span>
                </button>
              ))}
            </div>

            {status.text && (
              <div
                className={`alert alert-${status.type === "error" ? "error" : "success"}`}
                role="alert"
              >
                {status.type === "error" ? <FaExclamationCircle /> : <FaCheckCircle />}
                <div className="alert-body">{status.text}</div>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="login-email">
                  Email address
                </label>
                <div className="input-wrap">
                  <FaEnvelope />
                  <input
                    id="login-email"
                    className="input"
                    type="email"
                    placeholder="you@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="login-password">
                  Password
                </label>
                <div className="input-wrap">
                  <FaLock />
                  <input
                    id="login-password"
                    className="input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-trailing-btn"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="login-form-meta">
                <button
                  type="button"
                  className="login-link"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgot(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Signing in…
                  </>
                ) : (
                  `Sign in as ${activeRole.label}`
                )}
              </button>
            </form>

            <p className="login-foot-note">
              No account yet? Your institution&apos;s administrator provisions
              access.
            </p>
          </div>
        </main>
      </div>

      {/* ── Password reset ────────────────────────────────────── */}
      {showForgot && (
        <div
          className="modal-backdrop"
          onClick={closeForgot}
          role="presentation"
        >
          <div
            className="modal modal-sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <div className="modal-head">
              <div className="modal-head-left">
                <div className="modal-head-icon">
                  <FaKey />
                </div>
                <div>
                  <h3 className="modal-title" id="reset-title">
                    Reset password
                  </h3>
                  <p className="modal-sub">We&apos;ll email you a secure link.</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeForgot} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {resetSent ? (
              <div className="modal-body reset-done">
                <div className="reset-done-icon">
                  <FaCheckCircle />
                </div>
                <p>
                  If an account exists for <strong>{resetEmail}</strong>, a reset
                  link is on its way.
                </p>
                <button className="btn btn-primary btn-block" onClick={closeForgot}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="modal-body">
                  <div className="field">
                    <label className="field-label" htmlFor="reset-email">
                      Email address
                    </label>
                    <div className="input-wrap">
                      <FaEnvelope />
                      <input
                        id="reset-email"
                        className="input"
                        type="email"
                        placeholder="you@institution.edu"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn btn-secondary" onClick={closeForgot}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send reset link
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
