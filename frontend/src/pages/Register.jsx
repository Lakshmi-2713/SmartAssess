import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaGraduationCap,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaCheckCircle,
  FaEnvelope,
  FaUser,
  FaBuilding,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserShield,
  FaArrowLeft,
} from "react-icons/fa";
import API from "../services/api";
import { saveSession, isAuthenticated, getUser, homePathFor } from "../services/session";
import { useTheme } from "../context/useTheme";
import "../styles/Login.css";

const ROLES = [
  { key: "student", label: "Student", desc: "Take assessments", icon: <FaUserGraduate />, tone: "student" },
  { key: "faculty", label: "Faculty", desc: "Create & evaluate", icon: <FaChalkboardTeacher />, tone: "faculty" },
  { key: "admin", label: "Admin", desc: "System control", icon: <FaUserShield />, tone: "admin" },
];

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Data Science",
  "Artificial Intelligence",
  "Administration",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** Rough strength signal — length dominates, variety helps. */
function scorePassword(pw) {
  if (!pw) return { score: 0, label: "", tone: "" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const capped = Math.min(4, score);
  return {
    score: capped,
    label: ["Very weak", "Weak", "Fair", "Good", "Strong"][capped],
    tone: ["danger", "danger", "warning", "info", "success"][capped],
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { updateProfile } = useTheme();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    department: "Computer Science",
  });
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(homePathFor(getUser()?.role), { replace: true });
    }
  }, [navigate]);

  const activeRole = ROLES.find((r) => r.key === role) || ROLES[0];
  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.password.length < MIN_PASSWORD) {
      next.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (form.confirm !== form.password) next.confirm = "Passwords do not match.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        department: form.department,
      });

      const { token, user } = res.data || {};
      if (!token || !user) {
        throw new Error("The server did not return a valid session.");
      }

      // Registration signs you straight in — no second round trip.
      saveSession({ token, user });
      updateProfile({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
      });
      navigate(homePathFor(user.role), { replace: true });
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      setStatus({
        type: "error",
        text: err.userMessage || err.message || "Could not create the account.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-root tone-${activeRole.tone}`}>
      <div className="login-bg" aria-hidden="true">
        <span className="login-glow login-glow-a" />
        <span className="login-glow login-glow-b" />
        <span className="login-grid" />
      </div>

      <div className="login-shell register-shell">
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
              Create your <span>account</span>.
            </h1>
            <p className="login-blurb">
              One account gets you into your workspace — assessments, results and
              proctoring, all in one place.
            </p>

            <ul className="login-highlights">
              <li>
                <span className="lh-icon"><FaUserGraduate /></span>
                <div>
                  <strong>Students</strong>
                  <span>Sit proctored exams and review your scorecards.</span>
                </div>
              </li>
              <li>
                <span className="lh-icon"><FaChalkboardTeacher /></span>
                <div>
                  <strong>Faculty</strong>
                  <span>Author tests, grade submissions, track your cohort.</span>
                </div>
              </li>
              <li>
                <span className="lh-icon"><FaUserShield /></span>
                <div>
                  <strong>Administrators</strong>
                  <span>Manage the roster, accounts and system settings.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="login-brand-foot">
            <p className="login-copyright">© 2025 SmartAssess</p>
          </div>
        </aside>

        <main className="login-panel">
          <div className="login-panel-inner">
            <header className="login-panel-head">
              <h2>Create an account</h2>
              <p>Choose the role that matches how you&apos;ll use SmartAssess.</p>
            </header>

            <div className="role-picker" role="radiogroup" aria-label="Account type">
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
                    setForm((prev) => ({
                      ...prev,
                      department: r.key === "admin" ? "Administration" : prev.department,
                    }));
                  }}
                >
                  <span className="role-chip-icon">{r.icon}</span>
                  <span className="role-chip-label">{r.label}</span>
                  <span className="role-chip-desc">{r.desc}</span>
                </button>
              ))}
            </div>

            {status.text && (
              <div className="alert alert-error" role="alert">
                <FaExclamationCircle />
                <div className="alert-body">{status.text}</div>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="reg-name">Full name</label>
                <div className="input-wrap">
                  <FaUser />
                  <input
                    id="reg-name"
                    className={`input ${errors.name ? "has-error" : ""}`}
                    name="name"
                    value={form.name}
                    onChange={setField}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="reg-email">Email address</label>
                <div className="input-wrap">
                  <FaEnvelope />
                  <input
                    id="reg-email"
                    className={`input ${errors.email ? "has-error" : ""}`}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={setField}
                    placeholder="you@institution.edu"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="reg-dept">Department</label>
                <div className="input-wrap">
                  <FaBuilding />
                  <select
                    id="reg-dept"
                    className="select"
                    name="department"
                    value={form.department}
                    onChange={setField}
                    style={{ paddingLeft: "calc(var(--sp-3) * 2 + 14px)" }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="reg-password">Password</label>
                <div className="input-wrap">
                  <FaLock />
                  <input
                    id="reg-password"
                    className={`input ${errors.password ? "has-error" : ""}`}
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={setField}
                    placeholder={`At least ${MIN_PASSWORD} characters`}
                    autoComplete="new-password"
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
                {form.password && (
                  <div className="pw-strength">
                    <div className="pw-strength-track">
                      <div
                        className={`pw-strength-fill tone-${strength.tone}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className={`pw-strength-label tone-${strength.tone}`}>
                      {strength.label}
                    </span>
                  </div>
                )}
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="reg-confirm">Confirm password</label>
                <div className="input-wrap">
                  <FaLock />
                  <input
                    id="reg-confirm"
                    className={`input ${errors.confirm ? "has-error" : ""}`}
                    type={showPwd ? "text" : "password"}
                    name="confirm"
                    value={form.confirm}
                    onChange={setField}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Creating account…
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Create {activeRole.label.toLowerCase()} account
                  </>
                )}
              </button>
            </form>

            <p className="login-foot-note">
              Already have an account?{" "}
              <Link to="/" className="login-link">
                <FaArrowLeft style={{ fontSize: "0.8em" }} /> Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
