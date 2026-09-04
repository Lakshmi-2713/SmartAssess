import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileAlt,
  FaCalendarAlt,
  FaUsers,
  FaClipboardCheck,
  FaPlus,
  FaChalkboardTeacher,
  FaAward,
  FaEdit,
  FaChartBar,
  FaArrowRight,
  FaShieldAlt,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GradeSubmissionModal from "../components/GradeSubmissionModal";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import { useTheme } from "../context/useTheme";
import { getUser } from "../services/session";
import {
  getStoredTests,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredResults,
  saveStoredResults,
  nextId,
} from "../services/storage";
import "../styles/faculty.css";

const RECENT_ACTIVITY = [
  { id: 1, text: "Test “Java Programming Fundamentals” created", time: "1 hour ago", tone: "primary" },
  { id: 2, text: "Test “DBMS Fundamentals” published", time: "1 day ago", tone: "green" },
  { id: 3, text: "Evaluated 15 student submissions", time: "2 days ago", tone: "blue" },
  { id: 4, text: "New student batch registered", time: "3 days ago", tone: "amber" },
];

const isPending = (s) => String(s?.status ?? "").includes("Pending");

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const toasts = useToasts();
  const { userProfile } = useTheme();
  const user = getUser() || {};

  const [mobileOpen, setMobileOpen] = useState(false);
  // Lazy initialisers read storage once during mount instead of a
  // setState-inside-effect that triggers a second render pass.
  const [tests] = useState(() => getStoredTests());
  const [submissions, setSubmissions] = useState(() => getStoredSubmissions());
  const [selected, setSelected] = useState(null);

  const facultyName = userProfile?.name || user.name || "Faculty";

  const pendingCount = useMemo(
    () => submissions.filter(isPending).length,
    [submissions]
  );

  const upcoming = useMemo(
    () => tests.filter((t) => t.status !== "Draft"),
    [tests]
  );

  const totalEnrolled = useMemo(
    () => tests.reduce((sum, t) => sum + (Number(t.students) || 0), 0),
    [tests]
  );

  const handleGradeUpdate = useCallback(
    (graded) => {
      const updatedSubs = submissions.map((s) =>
        s.id === graded.id
          ? {
              ...s,
              // The denominator comes from the paper, not a hardcoded 100.
              score: `${graded.totalScore} / ${graded.maxScore}`,
              totalScore: graded.totalScore,
              maxScore: graded.maxScore,
              status: "Graded & Published",
              feedback: graded.feedback,
              questions: graded.questions,
            }
          : s
      );

      setSubmissions(updatedSubs);
      saveStoredSubmissions(updatedSubs);

      const percent =
        graded.maxScore > 0
          ? Math.round((graded.totalScore / graded.maxScore) * 100)
          : 0;

      const results = getStoredResults();
      const newResult = {
        id: nextId(),
        testId: graded.testId,
        title: graded.testTitle || "Assessment",
        test: graded.testTitle || "Assessment",
        subject: graded.subject || "Computer Science",
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        score: `${percent}%`,
        percent,
        student: graded.studentName,
        studentEmail: graded.studentEmail,
        reviewer: facultyName,
      };

      // Replace only THIS student's result for THIS test. Filtering by title
      // alone wiped every other student's result for the same paper.
      const withoutOld = results.filter(
        (r) =>
          !(
            r.studentEmail === graded.studentEmail &&
            (r.testId === graded.testId || r.title === graded.testTitle)
          )
      );
      saveStoredResults([newResult, ...withoutOld]);

      toasts.success(`Published ${graded.studentName}'s score (${percent}%).`);
    },
    [submissions, facultyName, toasts]
  );

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Faculty Dashboard"
          subtitle={`${facultyName} · ${userProfile?.department || "Computer Science"}`}
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          {/* Hero */}
          <section className="fac-hero">
            <div className="fac-hero-text">
              <span className="fac-hero-badge">
                <FaChalkboardTeacher /> Faculty workspace
              </span>
              <h2 className="fac-hero-title">Good to see you, {facultyName.split(" ")[0]}.</h2>
              <p className="fac-hero-sub">
                {pendingCount > 0 ? (
                  <>
                    You have <strong>{pendingCount}</strong> submission
                    {pendingCount === 1 ? "" : "s"} waiting for review.
                  </>
                ) : (
                  <>Everything is graded. Nothing is waiting on you right now.</>
                )}
              </p>
            </div>
            <div className="fac-hero-actions">
              <button className="btn btn-primary" onClick={() => navigate("/tests")}>
                <FaPlus /> Create test
              </button>
              <button className="btn btn-secondary" onClick={() => navigate("/results")}>
                <FaChartBar /> View analytics
              </button>
            </div>
          </section>

          {/* Stats */}
          <div className="stat-grid">
            <Tile tone="tile-teal" icon={<FaFileAlt />} value={tests.length} label="Total tests" />
            <Tile tone="tile-blue" icon={<FaCalendarAlt />} value={upcoming.length} label="Live & upcoming" />
            <Tile tone="tile-indigo" icon={<FaUsers />} value={totalEnrolled} label="Enrolments" />
            <Tile
              tone={pendingCount > 0 ? "tile-amber" : "tile-green"}
              icon={<FaClipboardCheck />}
              value={pendingCount}
              label="Pending evaluations"
            />
          </div>

          {/* Submissions */}
          <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaAward className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Submissions for correction</h3>
                    <p className="card-subtitle">
                      {pendingCount} pending · {submissions.length} total
                    </p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                {submissions.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon"><FaClipboardCheck /></span>
                    <p className="empty-title">No submissions yet</p>
                    <p className="empty-text">
                      Student attempts will appear here as they finish their tests.
                    </p>
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Assessment</th>
                        <th>Submitted</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th className="td-actions">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => {
                        const pending = isPending(s);
                        return (
                          <tr key={s.id}>
                            <td>
                              <div className="cell-user">
                                <span className="avatar avatar-sm avatar-student">
                                  {initials(s.studentName)}
                                </span>
                                <span className="cell-user-text">
                                  <span className="cell-user-name">{s.studentName}</span>
                                  <span className="cell-user-sub">{s.studentEmail}</span>
                                </span>
                              </div>
                            </td>
                            <td className="td-clip" title={s.testTitle}>{s.testTitle}</td>
                            <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>{s.date}</td>
                            <td className="td-strong tabular">{s.score}</td>
                            <td>
                              <span className={`badge ${pending ? "badge-warning" : "badge-success"}`}>
                                {pending ? "Pending" : "Published"}
                              </span>
                            </td>
                            <td className="td-actions">
                              <button
                                className={`btn btn-sm ${pending ? "btn-primary" : "btn-secondary"}`}
                                onClick={() => setSelected(s)}
                              >
                                <FaEdit /> {pending ? "Grade" : "Review"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
          </section>

          {/* Summary row */}
          <div className="grid-2">
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaCalendarAlt className="card-head-icon" />
                    <h3 className="card-title">Scheduled assessments</h3>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate("/tests")}>
                    All <FaArrowRight />
                  </button>
                </div>
                <div className="card-body-flush">
                  {upcoming.slice(0, 5).map((t) => (
                    <div key={t.id} className="fac-test-row">
                      <div className="fac-test-info">
                        <strong>{t.title}</strong>
                        <span>
                          {t.subject} · {t.duration} min · {t.marks} marks
                        </span>
                      </div>
                      <span
                        className={`badge ${
                          t.status === "Published" ? "badge-success" : "badge-info"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {upcoming.length === 0 && (
                    <div className="empty-state">
                      <p className="empty-text">No scheduled assessments.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaShieldAlt className="card-head-icon" />
                    <h3 className="card-title">Recent activity</h3>
                  </div>
                </div>
                <div className="card-body">
                  <ul className="fac-activity">
                    {RECENT_ACTIVITY.map((a) => (
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
          </div>
        </div>
      </div>

      {selected && (
        <GradeSubmissionModal
          submission={selected}
          onClose={() => setSelected(null)}
          onSaveGrade={handleGradeUpdate}
        />
      )}
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
