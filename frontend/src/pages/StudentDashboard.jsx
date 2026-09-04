import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaTrophy,
  FaShieldAlt,
  FaVideo,
  FaMicrophone,
  FaDesktop,
  FaWifi,
  FaPlay,
  FaEye,
  FaAward,
  FaBullhorn,
  FaBookOpen,
  FaGraduationCap,
  FaCode,
  FaDatabase,
  FaLayerGroup,
  FaLaptopCode,
  FaSyncAlt,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ScorecardReviewModal from "../components/ScorecardReviewModal";
import { useTheme } from "../context/useTheme";
import { getUser } from "../services/session";
import {
  getStoredTests,
  getStoredSubmissions,
  getStoredResults,
} from "../services/storage";
import "../styles/students.css";

const SUBJECT_ICONS = {
  Java: <FaLaptopCode />,
  DSA: <FaCode />,
  "Web Dev": <FaDesktop />,
  DBMS: <FaDatabase />,
  OS: <FaLayerGroup />,
  CN: <FaWifi />,
  Python: <FaLaptopCode />,
};

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "Mid-term examination schedule released",
    author: "Dr. Johnson (Dept. Chair)",
    time: "Today, 10:00",
    content:
      "The official schedule for 4th-semester midterms is live. Test your proctoring setup before your exam slot.",
    urgent: true,
  },
  {
    id: 2,
    title: "Re-attempt policy for Java assessment",
    author: "Examination Cell",
    time: "Yesterday",
    content:
      "Students who hit connectivity issues during the mock session may request a re-attempt from the coordinator.",
    urgent: false,
  },
  {
    id: 3,
    title: "AI proctoring update 3.4",
    author: "SmartAssess Support",
    time: "2 days ago",
    content:
      "Enable camera permissions before your exam. Dual-monitor setups are not permitted during live assessments.",
    urgent: false,
  },
];

const READINESS = [
  { key: "camera", icon: <FaVideo />, label: "Camera", hint: "Required for face verification" },
  { key: "mic", icon: <FaMicrophone />, label: "Microphone", hint: "Used for audio proctoring" },
  { key: "screen", icon: <FaDesktop />, label: "Display", hint: "Single-monitor, fullscreen capable" },
  { key: "network", icon: <FaWifi />, label: "Network", hint: "Stable connection detected" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [tests] = useState(() => getStoredTests());
  const [submissions] = useState(() => getStoredSubmissions());
  const [results] = useState(() => getStoredResults());

  const [filter, setFilter] = useState("ALL");
  const [scorecard, setScorecard] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);

  const user = getUser() || {};
  const studentName = userProfile?.name || user.name || "Student";
  const studentEmail = (userProfile?.email || user.email || "").toLowerCase();
  const studentDept = userProfile?.department || user.department || "Computer Science";

  /**
   * Only THIS student's records. Previously every student's results counted
   * toward completion, so tests other people had finished showed as done and
   * could not be started.
   */
  const myResults = useMemo(
    () =>
      results.filter(
        (r) =>
          (r.studentEmail || "").toLowerCase() === studentEmail ||
          (!r.studentEmail && r.student === studentName)
      ),
    [results, studentEmail, studentName]
  );

  const mySubmissions = useMemo(
    () =>
      submissions.filter(
        (s) =>
          (s.studentEmail || "").toLowerCase() === studentEmail ||
          (!s.studentEmail && s.studentName === studentName)
      ),
    [submissions, studentEmail, studentName]
  );

  /** Completion is keyed on testId — title matching was fragile and wrong. */
  const completedTestIds = useMemo(() => {
    const ids = new Set();
    for (const r of myResults) if (r.testId != null) ids.add(String(r.testId));
    for (const s of mySubmissions) if (s.testId != null) ids.add(String(s.testId));
    return ids;
  }, [myResults, mySubmissions]);

  const isCompleted = (test) => completedTestIds.has(String(test.id));

  const availableTests = useMemo(
    () => tests.filter((t) => t.status !== "Draft" && !isCompleted(t)),
    [tests, completedTestIds] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filteredTests = useMemo(() => {
    if (filter === "AVAILABLE") return availableTests;
    if (filter === "COMPLETED") return tests.filter(isCompleted);
    return tests;
  }, [tests, filter, availableTests, completedTestIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextTest = availableTests[0] || null;

  const averageScore = useMemo(() => {
    const scored = myResults
      .map((r) => (Number.isFinite(r.percent) ? r.percent : Number.parseFloat(r.score)))
      .filter((n) => Number.isFinite(n));
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  }, [myResults]);

  const mastery = useMemo(() => {
    const bySubject = new Map();
    for (const r of myResults) {
      const pct = Number.isFinite(r.percent) ? r.percent : Number.parseFloat(r.score);
      if (!Number.isFinite(pct)) continue;
      const key = r.subject || "General";
      const entry = bySubject.get(key) || { total: 0, count: 0 };
      entry.total += pct;
      entry.count += 1;
      bySubject.set(key, entry);
    }
    return Array.from(bySubject.entries())
      .map(([subject, { total, count }]) => ({
        subject,
        score: Math.round(total / count),
      }))
      .sort((a, b) => b.score - a.score);
  }, [myResults]);

  const openScorecard = (test) => {
    const result =
      myResults.find((r) => String(r.testId) === String(test.id)) || {
        title: test.title,
        test: test.title,
        subject: test.subject,
        date: test.date,
        score: "—",
        student: studentName,
      };
    const submission = mySubmissions.find((s) => String(s.testId) === String(test.id));
    setScorecard({ result, submission });
  };

  const startTest = (test) => {
    navigate(`/take-test?testId=${test.id}`);
  };

  const runSystemCheck = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setCheckedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 1100);
  };

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="app-main">
        <Navbar
          title="Student Portal"
          subtitle={`${studentName} · ${studentDept}`}
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          {/* Hero */}
          <section className="std-hero">
            <div className="std-hero-left">
              <span className="std-hero-badge">
                <span className="dot dot-pulse" /> Academic session 2024–25
              </span>
              <h2 className="std-hero-title">
                Welcome back, <span>{studentName.split(" ")[0]}</span>
              </h2>
              <p className="std-hero-text">
                {availableTests.length > 0 ? (
                  <>
                    You have <strong>{availableTests.length}</strong> assessment
                    {availableTests.length === 1 ? "" : "s"} left to complete this term.
                  </>
                ) : (
                  <>You&apos;re all caught up — no assessments are pending.</>
                )}
              </p>

              <div className="std-hero-meta">
                <span className="std-meta-chip">
                  <FaGraduationCap /> Roll no: <strong>{user.rollNumber || "CSE-2022-084"}</strong>
                </span>
                <span className="std-meta-chip">
                  <FaShieldAlt /> Proctor status: <strong>Clear</strong>
                </span>
                <span className="std-meta-chip">
                  <FaBookOpen /> <strong>{studentDept}</strong>
                </span>
              </div>
            </div>

            {nextTest && (
              <div className="std-hero-cta">
                <div className="std-cta-head">
                  <span className="std-cta-tag">
                    <span className="dot dot-pulse" /> Next up
                  </span>
                  <span className="badge badge-primary">{nextTest.subject}</span>
                </div>
                <h3 className="std-cta-title">{nextTest.title}</h3>
                <div className="std-cta-details">
                  <span><FaClock /> {nextTest.duration} min</span>
                  <span><FaAward /> {nextTest.marks} marks</span>
                  <span><FaCalendarAlt /> {nextTest.date}</span>
                </div>
                <button className="btn btn-primary btn-block" onClick={() => startTest(nextTest)}>
                  <FaPlay /> Start assessment
                </button>
              </div>
            )}
          </section>

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-tile tile-indigo">
              <span className="stat-tile-icon"><FaTrophy /></span>
              <div className="stat-tile-body">
                <span className="stat-value">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </span>
                <span className="stat-label">Average score</span>
              </div>
            </div>
            <div className="stat-tile tile-green">
              <span className="stat-tile-icon"><FaCheckCircle /></span>
              <div className="stat-tile-body">
                <span className="stat-value">{completedTestIds.size}</span>
                <span className="stat-label">Assessments completed</span>
              </div>
            </div>
            <div className="stat-tile tile-blue">
              <span className="stat-tile-icon"><FaClock /></span>
              <div className="stat-tile-body">
                <span className="stat-value">{availableTests.length}</span>
                <span className="stat-label">Pending assessments</span>
              </div>
            </div>
            <div className="stat-tile tile-teal">
              <span className="stat-tile-icon"><FaShieldAlt /></span>
              <div className="stat-tile-body">
                <span className="stat-value">
                  {mySubmissions.reduce(
                    (n, s) => n + (s.proctoring?.totalStrikes || 0),
                    0
                  )}
                </span>
                <span className="stat-label">Integrity flags</span>
              </div>
            </div>
          </div>

          <div className="split-main">
            {/* Assessments */}
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaClipboardList className="card-head-icon" />
                  <h3 className="card-title">Your assessments</h3>
                </div>
                <div className="tabs">
                  {[
                    { key: "ALL", label: "All", count: tests.length },
                    { key: "AVAILABLE", label: "Available", count: availableTests.length },
                    { key: "COMPLETED", label: "Completed", count: completedTestIds.size },
                  ].map((t) => (
                    <button
                      key={t.key}
                      className={`tab ${filter === t.key ? "is-active" : ""}`}
                      onClick={() => setFilter(t.key)}
                    >
                      {t.label} <span className="tab-count">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-body-flush">
                {filteredTests.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon"><FaCheckCircle /></span>
                    <p className="empty-title">Nothing here</p>
                    <p className="empty-text">No assessments match this filter.</p>
                  </div>
                ) : (
                  <div className="assess-list">
                    {filteredTests.map((test) => {
                      const done = isCompleted(test);
                      const result = myResults.find(
                        (r) => String(r.testId) === String(test.id)
                      );
                      return (
                        <div key={test.id} className="assess-item">
                          <span className="assess-icon">
                            {SUBJECT_ICONS[test.subject] || <FaCode />}
                          </span>

                          <div className="assess-body">
                            <div className="assess-title-row">
                              <span className="assess-title">{test.title}</span>
                              {test.proctored && (
                                <span className="badge badge-primary">
                                  <FaShieldAlt /> Proctored
                                </span>
                              )}
                              {test.status === "Draft" && (
                                <span className="badge badge-neutral">Draft</span>
                              )}
                            </div>
                            <div className="assess-meta">
                              <span><FaBookOpen /> {test.subject}</span>
                              <span><FaClock /> {test.duration} min</span>
                              <span><FaAward /> {test.marks} marks</span>
                              <span><FaCalendarAlt /> {test.date}</span>
                            </div>
                          </div>

                          <div className="assess-actions">
                            {done ? (
                              <>
                                <span className="badge badge-success badge-lg">
                                  {result?.score || "Graded"}
                                </span>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openScorecard(test)}
                                >
                                  <FaEye /> Scorecard
                                </button>
                              </>
                            ) : test.status === "Draft" ? (
                              <span className="text-sm text-muted">Not released</span>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => startTest(test)}
                              >
                                <FaPlay /> Start
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Side column */}
            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaShieldAlt className="card-head-icon" />
                    <div>
                      <h3 className="card-title">Exam readiness</h3>
                      {checkedAt && (
                        <p className="card-subtitle">Last checked {checkedAt}</p>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={runSystemCheck}
                    disabled={checking}
                  >
                    {checking ? <span className="spinner" /> : <FaSyncAlt />} Check
                  </button>
                </div>
                <div className="card-body">
                  <div className="ready-list">
                    {READINESS.map((item) => (
                      <div key={item.key} className="ready-item is-ok">
                        <span className="ready-icon">{item.icon}</span>
                        <span className="ready-text">
                          <strong>{item.label}</strong>
                          <span>{item.hint}</span>
                        </span>
                        <span className="ready-state">
                          {checking ? (
                            <span className="spinner" />
                          ) : (
                            <FaCheckCircle style={{ color: "var(--success)" }} />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {mastery.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaTrophy className="card-head-icon" />
                      <h3 className="card-title">Subject performance</h3>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="mastery-list">
                      {mastery.map((m) => (
                        <div key={m.subject} className="mastery-row">
                          <div className="mastery-head">
                            <span className="mastery-name">{m.subject}</span>
                            <span className="mastery-score">{m.score}%</span>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${
                                m.score >= 80 ? "is-success" : m.score >= 60 ? "" : "is-warning"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaBullhorn className="card-head-icon" />
                    <h3 className="card-title">Announcements</h3>
                  </div>
                </div>
                <div className="card-body-flush">
                  <div className="announce-list">
                    {ANNOUNCEMENTS.map((a) => (
                      <article
                        key={a.id}
                        className={`announce-item ${a.urgent ? "is-urgent" : ""}`}
                      >
                        <span className="announce-rail" />
                        <div className="announce-body">
                          <div className="announce-title-row">
                            <span className="announce-title">{a.title}</span>
                            {a.urgent && <span className="badge badge-danger">Urgent</span>}
                          </div>
                          <span className="announce-meta">
                            {a.author} · {a.time}
                          </span>
                          <p className="announce-text">{a.content}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {scorecard && (
        <ScorecardReviewModal
          result={scorecard.result}
          submission={scorecard.submission}
          onClose={() => setScorecard(null)}
        />
      )}
    </div>
  );
}
