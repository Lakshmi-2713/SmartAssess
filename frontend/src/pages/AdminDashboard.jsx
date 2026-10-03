import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaChartBar,
  FaSyncAlt,
  FaExclamationTriangle,
  FaUsersCog,
  FaBuilding,
  FaArrowRight,
  FaCircle,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import API from "../services/api";
import { getStoredTests, getStoredResults } from "../services/storage";
import "../styles/dashboard.css";

const ACTIVITY = [
  { id: 1, text: "New student registered", time: "12 minutes ago", tone: "green" },
  { id: 2, text: "Java assessment created", time: "1 hour ago", tone: "primary" },
  { id: 3, text: "Results published for Computer Networks", time: "3 hours ago", tone: "blue" },
  { id: 4, text: "Faculty account provisioned", time: "Yesterday", tone: "amber" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toasts = useToasts();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tests] = useState(() => getStoredTests());
  const [results] = useState(() => getStoredResults());

  const load = useCallback(async ({ showSpinner = true } = {}) => {
    // `loading` starts true, so the mount path skips this synchronous set.
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const [rosterRes, statsRes] = await Promise.allSettled([
        API.get("/students"),
        API.get("/admin/stats"),
      ]);

      if (rosterRes.status === "fulfilled") {
        setStudents(Array.isArray(rosterRes.value.data) ? rosterRes.value.data : []);
      } else {
        setStudents([]);
        throw rosterRes.reason;
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      setError(err.userMessage || "Could not load administrative data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load({ showSpinner: false });
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Figures are derived from real data, not padded with invented constants.
  const derived = useMemo(
    () => ({
      students: stats?.students ?? students.length,
      active: stats?.activeStudents ?? students.filter((s) => s.status === "Active").length,
      faculty: stats?.facultyCount ?? null,
      departments:
        stats?.departmentCount ??
        new Set(students.map((s) => s.department).filter(Boolean)).size,
    }),
    [stats, students]
  );

  const recent = useMemo(() => students.slice(0, 8), [students]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Admin Overview"
          subtitle="Students, faculty, assessments and system health"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          <div className="page-head">
            <div className="page-head-title">
              <span className="page-head-icon"><FaUsersCog /></span>
              <div>
                <h2 className="page-title">System overview</h2>
                <p className="page-subtitle">
                  {loading ? "Loading…" : "Live figures from the API"}
                </p>
              </div>
            </div>
            <div className="page-head-actions">
              <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>
                {loading ? <span className="spinner" /> : <FaSyncAlt />} Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <FaExclamationTriangle />
              <div className="alert-body">
                <div className="alert-title">Could not reach the API</div>
                <div>{error}</div>
              </div>
              <button className="btn btn-sm btn-danger-soft" onClick={() => load()}>Retry</button>
            </div>
          )}

          <div className="stat-grid">
            <Tile
              tone="tile-primary"
              icon={<FaUserGraduate />}
              value={loading ? "—" : derived.students}
              label="Registered students"
              sub={derived.active !== null ? `${derived.active} active` : null}
            />
            <Tile
              tone="tile-teal"
              icon={<FaChalkboardTeacher />}
              value={loading ? "—" : derived.faculty ?? "—"}
              label="Faculty accounts"
            />
            <Tile
              tone="tile-blue"
              icon={<FaClipboardList />}
              value={tests.length}
              label="Assessments"
              sub={`${tests.filter((t) => t.status === "Published").length} published`}
            />
            <Tile
              tone="tile-amber"
              icon={<FaChartBar />}
              value={results.length}
              label="Results recorded"
            />
            <Tile
              tone="tile-indigo"
              icon={<FaBuilding />}
              value={loading ? "—" : derived.departments}
              label="Departments"
            />
          </div>

          <div className="split-main">
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaUserGraduate className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Recent registrations</h3>
                    <p className="card-subtitle">
                      {loading ? "Loading…" : `${students.length} total on the roster`}
                    </p>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate("/students")}>
                  Manage <FaArrowRight />
                </button>
              </div>

              <div className="table-wrap">
                {loading ? (
                  <div className="card-body">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton skeleton-row" />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon"><FaUserGraduate /></span>
                    <p className="empty-title">No students registered</p>
                    <p className="empty-text">
                      Add students from the roster to see them here.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate("/students")}>
                      Go to roster
                    </button>
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Department</th>
                        <th>Sem</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <div className="cell-user">
                              <span className="avatar avatar-sm avatar-student">
                                {initials(s.name)}
                              </span>
                              <span className="cell-user-text">
                                <span className="cell-user-name">{s.name}</span>
                                <span className="cell-user-sub">{s.email}</span>
                              </span>
                            </div>
                          </td>
                          <td>{s.department}</td>
                          <td className="tabular">{s.semester}</td>
                          <td>
                            <span
                              className={`badge ${
                                s.status === "Active" ? "badge-success" : "badge-neutral"
                              }`}
                            >
                              <span className="dot" /> {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaCircle className="card-head-icon" style={{ fontSize: 10 }} />
                    <h3 className="card-title">Recent activity</h3>
                  </div>
                </div>
                <div className="card-body">
                  <ul className="fac-activity">
                    {ACTIVITY.map((a) => (
                      <li key={a.id}>
                        <span className={`fac-activity-dot tone-${a.tone}`} />
                        <div>
                          <p>{a.text}</p>
                          <span>{a.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaClipboardList className="card-head-icon" />
                    <h3 className="card-title">Assessment status</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="stack-sm">
                    {["Published", "Upcoming", "Draft"].map((status) => {
                      const count = tests.filter((t) => t.status === status).length;
                      const share = tests.length ? Math.round((count / tests.length) * 100) : 0;
                      return (
                        <div key={status} className="admin-status-row">
                          <span className="admin-status-label">{status}</span>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${
                                status === "Published"
                                  ? "is-success"
                                  : status === "Draft"
                                  ? "is-warning"
                                  : ""
                              }`}
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="admin-status-count tabular">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function initials(name) {
  if (!name) return "??";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Tile({ tone, icon, value, label, sub }) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span className="stat-tile-icon">{icon}</span>
      <div className="stat-tile-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-trend">{sub}</span>}
      </div>
    </div>
  );
}
