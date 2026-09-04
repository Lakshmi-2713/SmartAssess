import { useState, useMemo } from "react";
import {
  FaUser,
  FaClipboardCheck,
  FaChartLine,
  FaTrophy,
  FaFileExport,
  FaTimes,
  FaMedal,
  FaChartBar,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import { getUser } from "../services/session";
import { getStoredResults } from "../services/storage";
import "../styles/results.css";

const BANDS = [
  { key: "90–100", min: 90, max: 100, tone: "var(--success)" },
  { key: "75–89", min: 75, max: 89, tone: "#38bdf8" },
  { key: "60–74", min: 60, max: 74, tone: "var(--primary-accent)" },
  { key: "40–59", min: 40, max: 59, tone: "var(--warning)" },
  { key: "0–39", min: 0, max: 39, tone: "var(--danger)" },
];

const percentOf = (r) =>
  Number.isFinite(r.percent) ? r.percent : Number.parseFloat(String(r.score ?? ""));

/**
 * RFC 4180 field escaping: wrap in quotes and double any embedded quote.
 * The previous export produced a broken file for any name containing a quote.
 * The leading apostrophe on =,+,-,@ defuses spreadsheet formula injection.
 */
function csvField(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export default function ResultsAnalytics() {
  const toasts = useToasts();
  const user = getUser() || {};
  const isStudent = user.role === "student";
  const myEmail = (user.email || "").toLowerCase();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [allResults] = useState(() => getStoredResults());
  const [selectedTest, setSelectedTest] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");

  // Students only ever see their own results.
  const scoped = useMemo(
    () =>
      isStudent
        ? allResults.filter(
            (r) =>
              (r.studentEmail || "").toLowerCase() === myEmail ||
              (!r.studentEmail && r.student === user.name)
          )
        : allResults,
    [allResults, isStudent, myEmail, user.name]
  );

  // Filter options are derived from the data, so they always match something.
  const testOptions = useMemo(
    () => Array.from(new Set(scoped.map((r) => r.title || r.test).filter(Boolean))).sort(),
    [scoped]
  );

  const subjectOptions = useMemo(
    () => Array.from(new Set(scoped.map((r) => r.subject).filter(Boolean))).sort(),
    [scoped]
  );

  const filtered = useMemo(
    () =>
      scoped.filter((r) => {
        const testMatch = selectedTest === "ALL" || (r.title || r.test) === selectedTest;
        const subjMatch = selectedSubject === "ALL" || r.subject === selectedSubject;
        return testMatch && subjMatch;
      }),
    [scoped, selectedTest, selectedSubject]
  );

  const stats = useMemo(() => {
    const percents = filtered.map(percentOf).filter(Number.isFinite);
    const students = new Set(
      filtered.map((r) => (r.studentEmail || r.student || "").toLowerCase()).filter(Boolean)
    );
    const avg =
      percents.length > 0
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : null;
    const top = percents.filter((p) => p >= 85).length;
    return { students: students.size, completed: filtered.length, avg, top };
  }, [filtered]);

  const distribution = useMemo(() => {
    const percents = filtered.map(percentOf).filter(Number.isFinite);
    const total = percents.length || 1;
    return BANDS.map((b) => {
      const count = percents.filter((p) => p >= b.min && p <= b.max).length;
      return { ...b, count, share: Math.round((count / total) * 100) };
    });
  }, [filtered]);

  const leaderboard = useMemo(
    () =>
      [...filtered]
        .map((r) => ({ ...r, pct: percentOf(r) }))
        .filter((r) => Number.isFinite(r.pct))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5),
    [filtered]
  );

  const bySubject = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const pct = percentOf(r);
      if (!Number.isFinite(pct)) continue;
      const key = r.subject || "General";
      const e = map.get(key) || { total: 0, count: 0 };
      e.total += pct;
      e.count += 1;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([subject, { total, count }]) => ({
        subject,
        avg: Math.round(total / count),
        count,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toasts.warning("There is nothing to export with the current filters.");
      return;
    }

    const header = ["#", "Student", "Email", "Assessment", "Subject", "Score", "Date", "Evaluator"];
    const rows = filtered.map((r, i) =>
      [
        i + 1,
        r.student ?? "",
        r.studentEmail ?? "",
        r.title || r.test || "",
        r.subject ?? "",
        r.score ?? "",
        r.date ?? "",
        r.reviewer ?? "",
      ].map(csvField).join(",")
    );

    // BOM so Excel reads UTF-8 correctly.
    const csv = "﻿" + [header.map(csvField).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `smartassess_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Without this the blob is retained for the lifetime of the document.
    URL.revokeObjectURL(url);
    toasts.success(`Exported ${filtered.length} result${filtered.length === 1 ? "" : "s"}.`);
  };

  const resetFilters = () => {
    setSelectedTest("ALL");
    setSelectedSubject("ALL");
  };

  const hasFilters = selectedTest !== "ALL" || selectedSubject !== "ALL";
  const maxBand = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title={isStudent ? "My Scorecard" : "Results & Analytics"}
          subtitle={isStudent ? "Your assessment history" : "Cohort performance overview"}
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          <div className="page-head">
            <div className="page-head-title">
              <span className="page-head-icon"><FaChartLine /></span>
              <div>
                <h2 className="page-title">{isStudent ? "My results" : "Results dashboard"}</h2>
                <p className="page-subtitle">
                  {filtered.length} record{filtered.length === 1 ? "" : "s"}
                  {hasFilters ? " (filtered)" : ""}
                </p>
              </div>
            </div>

            <div className="page-head-actions">
              <select
                className="select"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                aria-label="Filter by assessment"
              >
                <option value="ALL">All assessments</option>
                {testOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                className="select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                aria-label="Filter by subject"
              >
                <option value="ALL">All subjects</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              {hasFilters && (
                <button className="btn btn-ghost" onClick={resetFilters}>
                  <FaTimes /> Clear
                </button>
              )}

              <button className="btn btn-primary" onClick={handleExportCSV}>
                <FaFileExport /> Export CSV
              </button>
            </div>
          </div>

          <div className="stat-grid">
            <Tile tone="tile-blue" icon={<FaUser />} value={stats.students} label={isStudent ? "Assessments taken" : "Students assessed"} />
            <Tile tone="tile-green" icon={<FaClipboardCheck />} value={stats.completed} label="Results recorded" />
            <Tile tone="tile-primary" icon={<FaChartLine />} value={stats.avg !== null ? `${stats.avg}%` : "—"} label="Average score" />
            <Tile tone="tile-amber" icon={<FaTrophy />} value={stats.top} label="Scores ≥ 85%" />
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon"><FaChartBar /></span>
                <p className="empty-title">No results to show</p>
                <p className="empty-text">
                  {scoped.length === 0
                    ? "Results appear here once assessments have been graded."
                    : "No records match the current filters."}
                </p>
                {hasFilters && (
                  <button className="btn btn-secondary" onClick={resetFilters}>Clear filters</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid-2">
                {/* Distribution */}
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaChartBar className="card-head-icon" />
                      <h3 className="card-title">Score distribution</h3>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="dist-chart">
                      {distribution.map((b) => (
                        <div key={b.key} className="dist-col">
                          <span className="dist-count tabular">{b.count}</span>
                          <div className="dist-bar-track">
                            <div
                              className="dist-bar"
                              style={{
                                height: `${(b.count / maxBand) * 100}%`,
                                background: b.tone,
                              }}
                            />
                          </div>
                          <span className="dist-label">{b.key}</span>
                          <span className="dist-share">{b.share}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Leaderboard */}
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaMedal className="card-head-icon" />
                      <h3 className="card-title">Top performers</h3>
                    </div>
                  </div>
                  <div className="card-body-flush">
                    <ol className="leader-list">
                      {leaderboard.map((r, i) => (
                        <li key={r.id ?? i} className={`leader-row rank-${i + 1}`}>
                          <span className="leader-rank">{i + 1}</span>
                          <span className="avatar avatar-sm avatar-student">
                            {initials(r.student)}
                          </span>
                          <span className="leader-info">
                            <strong className="truncate">{r.student || "—"}</strong>
                            <span className="truncate">{r.title || r.test}</span>
                          </span>
                          <span className="leader-score tabular">{Math.round(r.pct)}%</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              </div>

              {bySubject.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaChartLine className="card-head-icon" />
                      <h3 className="card-title">Average by subject</h3>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="subject-bars">
                      {bySubject.map((s) => (
                        <div key={s.subject} className="subject-row">
                          <span className="subject-name">{s.subject}</span>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${
                                s.avg >= 80 ? "is-success" : s.avg >= 60 ? "" : "is-warning"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, s.avg))}%` }}
                            />
                          </div>
                          <span className="subject-avg tabular">{s.avg}%</span>
                          <span className="subject-count text-xs text-muted">
                            n={s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Table */}
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaClipboardCheck className="card-head-icon" />
                    <h3 className="card-title">All results</h3>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {!isStudent && <th>Student</th>}
                        <th>Assessment</th>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Evaluator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const pct = percentOf(r);
                        return (
                          <tr key={r.id ?? i}>
                            <td className="tabular text-muted">{i + 1}</td>
                            {!isStudent && (
                              <td>
                                <div className="cell-user">
                                  <span className="avatar avatar-sm avatar-student">
                                    {initials(r.student)}
                                  </span>
                                  <span className="cell-user-text">
                                    <span className="cell-user-name">{r.student || "—"}</span>
                                    <span className="cell-user-sub">{r.studentEmail || ""}</span>
                                  </span>
                                </div>
                              </td>
                            )}
                            <td className="td-strong">{r.title || r.test}</td>
                            <td>{r.subject || "—"}</td>
                            <td>
                              <span
                                className={`badge ${
                                  !Number.isFinite(pct)
                                    ? "badge-neutral"
                                    : pct >= 80
                                    ? "badge-success"
                                    : pct >= 60
                                    ? "badge-info"
                                    : "badge-warning"
                                }`}
                              >
                                {r.score ?? "—"}
                              </span>
                            </td>
                            <td className="text-sm text-muted">{r.date}</td>
                            <td className="text-sm">{r.reviewer || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name) {
  if (!name) return "??";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Tile({ tone, icon, value, label }) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span className="stat-tile-icon">{icon}</span>
      <div className="stat-tile-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}
