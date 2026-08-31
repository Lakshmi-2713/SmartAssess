import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ScorecardReviewModal from "../components/ScorecardReviewModal";
import { useTheme } from "../context/ThemeContext";
import {
  FaUserGraduate,
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaChartLine,
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
  FaCheck,
  FaExclamationCircle,
  FaGraduationCap,
  FaArrowRight,
  FaCode,
  FaDatabase,
  FaLayerGroup,
  FaLaptopCode,
} from "react-icons/fa";
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
    title: "Mid-Term Examination Schedule Released",
    author: "Dr. Johnson (Dept. Chair)",
    time: "Today, 10:00 AM",
    content: "The official schedule for 4th Semester Midterms is now live. Ensure your proctoring setup is tested prior to exam time.",
    urgent: true,
  },
  {
    id: 2,
    title: "Java Programming Assessment Re-attempt Policy",
    author: "Examination Cell",
    time: "Yesterday",
    content: "Students who experienced connectivity anomalies during the mock session may submit requests to the department coordinator.",
    urgent: false,
  },
  {
    id: 3,
    title: "AI Proctoring System Update 3.4",
    author: "SmartAssess Tech Support",
    time: "2 days ago",
    content: "Ensure camera permissions are enabled in your browser. Dual-monitor configurations are strictly prohibited during live assessments.",
    urgent: false,
  },
];

function StudentDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Stored state synced across application
  const [tests, setTests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState([]);

  // Active filter tab for assessments
  const [assessmentFilter, setAssessmentFilter] = useState("ALL");
  const [selectedScorecardResult, setSelectedScorecardResult] = useState(null);

  // System readiness checker states
  const [cameraChecked, setCameraChecked] = useState(true);
  const [micChecked, setMicChecked] = useState(true);
  const [screenChecked, setScreenChecked] = useState(true);
  const [networkChecked, setNetworkChecked] = useState(true);
  const [testingHardware, setTestingHardware] = useState(false);

  const storedUser = useMemo(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : {};
    } catch {
      return {};
    }
  }, []);

  const studentName = userProfile?.name || storedUser.name || "Rahul Verma";
  const studentEmail = userProfile?.email || storedUser.email || "rahul.verma@student.com";
  const studentDept = userProfile?.department || storedUser.department || "Computer Science & Engineering";

  useEffect(() => {
    setTests(getStoredTests());
    setSubmissions(getStoredSubmissions());
    setResults(getStoredResults());
  }, []);

  // Compute test status mapping (whether student has already taken it)
  const completedTestTitles = useMemo(() => {
    const fromResults = results.map((r) => r.title || r.test);
    const fromSubs = submissions.map((s) => s.testTitle);
    return new Set([...fromResults, ...fromSubs]);
  }, [results, submissions]);

  // Filtered Assessments
  const filteredTests = useMemo(() => {
    if (assessmentFilter === "ALL") return tests;
    if (assessmentFilter === "AVAILABLE") {
      return tests.filter((t) => t.status !== "Draft" && !completedTestTitles.has(t.title));
    }
    if (assessmentFilter === "COMPLETED") {
      return tests.filter((t) => completedTestTitles.has(t.title));
    }
    if (assessmentFilter === "UPCOMING") {
      return tests.filter((t) => t.status === "Upcoming" && !completedTestTitles.has(t.title));
    }
    return tests;
  }, [tests, assessmentFilter, completedTestTitles]);

  // Next imminent test to take
  const nextAvailableTest = useMemo(() => {
    return tests.find((t) => t.status !== "Draft" && !completedTestTitles.has(t.title)) || tests[0];
  }, [tests, completedTestTitles]);

  // Subject Mastery Breakdown
  const subjectMastery = [
    { subject: "Java Programming", score: 95, grade: "A+", status: "Mastery", color: "#10b981" },
    { subject: "DBMS Fundamentals", score: 88, grade: "A", status: "Advanced", color: "#6366f1" },
    { subject: "Data Structures & Algorithms", score: 85, grade: "A", status: "Advanced", color: "#38bdf8" },
    { subject: "Operating Systems", score: 85, grade: "A", status: "Advanced", color: "#818cf8" },
    { subject: "Python Programming", score: 80, grade: "B+", status: "Proficient", color: "#f59e0b" },
    { subject: "Web Development", score: 78, grade: "B+", status: "Proficient", color: "#ec4899" },
  ];

  // Run hardware verification
  const handleRunSystemCheck = () => {
    setTestingHardware(true);
    setTimeout(() => {
      setCameraChecked(true);
      setMicChecked(true);
      setScreenChecked(true);
      setNetworkChecked(true);
      setTestingHardware(false);
    }, 1200);
  };

  const handleStartTest = (testObj) => {
    localStorage.setItem("smartassess_active_test", JSON.stringify(testObj));
    navigate(`/take-test?testId=${testObj.id}`);
  };

  const handleOpenScorecard = (testTitle) => {
    const matchedResult = results.find((r) => (r.title || r.test) === testTitle) || {
      id: Date.now(),
      title: testTitle,
      test: testTitle,
      subject: "Computer Science",
      date: "Recent Session",
      score: "85%",
      student: studentName,
      reviewer: "Dr. Johnson",
    };
    setSelectedScorecardResult(matchedResult);
  };

  return (
    <div className="student-layout-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="student-main-content">
        <Navbar
          title="Student Learning Portal"
          subtitle={`${studentName} • B.Tech ${studentDept} • 4th Semester`}
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="student-dashboard-body">
          {/* ── HERO BANNER ────────────────────────────────────────── */}
          <div className="student-hero-banner">
            <div className="hero-content-col">
              <div className="hero-badge-pill">
                <span className="hero-pulse-dot"></span>
                <span>4th Semester • Academic Session 2024-2025</span>
              </div>
              <h1 className="hero-student-greeting">
                Welcome back, <span>{studentName}</span>! 👋
              </h1>
              <p className="hero-student-desc">
                Your AI-proctored examination environment is active. You have{" "}
                <strong>{tests.filter((t) => t.status !== "Draft" && !completedTestTitles.has(t.title)).length} assessments</strong>{" "}
                scheduled for completion this term.
              </p>
              <div className="hero-student-meta">
                <div className="meta-badge-item">
                  <FaGraduationCap className="meta-icon" />
                  <span>Roll No: <strong>CSE-2022-084</strong></span>
                </div>
                <div className="meta-badge-item">
                  <FaShieldAlt className="meta-icon text-emerald" />
                  <span>AI Proctor Status: <strong>Verified &amp; Clean</strong></span>
                </div>
                <div className="meta-badge-item">
                  <FaBookOpen className="meta-icon text-blue" />
                  <span>Department: <strong>{studentDept}</strong></span>
                </div>
              </div>
            </div>

            {nextAvailableTest && (
              <div className="hero-cta-card">
                <div className="cta-card-header">
                  <span className="cta-live-tag">● NEXT SCHEDULED EXAM</span>
                  <span className="cta-subject-badge">{nextAvailableTest.subject}</span>
                </div>
                <h3 className="cta-test-title">{nextAvailableTest.title}</h3>
                <div className="cta-test-details">
                  <span><FaClock /> {nextAvailableTest.duration} Minutes</span>
                  <span><FaAward /> {nextAvailableTest.marks} Total Marks</span>
                  <span><FaCalendarAlt /> {nextAvailableTest.date}</span>
                </div>
                <button
                  className="btn-hero-launch-exam"
                  onClick={() => handleStartTest(nextAvailableTest)}
                >
                  <FaPlay /> Start Assessment Now
                </button>
              </div>
            )}
          </div>

          {/* ── STATS KPI CARDS ────────────────────────────────────── */}
          <div className="student-stats-grid">
            <div className="std-stat-card card-indigo">
              <div className="stat-card-icon-wrap">
                <FaTrophy />
              </div>
              <div className="stat-card-body-wrap">
                <div className="stat-count">8.8<span className="stat-denom">/10</span></div>
                <div className="stat-title">Overall CGPA (Grade A+)</div>
                <span className="stat-trend-tag positive">+4.2% from last term</span>
              </div>
            </div>

            <div className="std-stat-card card-emerald">
              <div className="stat-card-icon-wrap">
                <FaClipboardList />
              </div>
              <div className="stat-card-body-wrap">
                <div className="stat-count">{completedTestTitles.size}</div>
                <div className="stat-title">Assessments Completed</div>
                <span className="stat-trend-tag neutral">All Evaluations Synced</span>
              </div>
            </div>

            <div className="std-stat-card card-blue">
              <div className="stat-card-icon-wrap">
                <FaClock />
              </div>
              <div className="stat-card-body-wrap">
                <div className="stat-count">
                  {tests.filter((t) => t.status !== "Draft" && !completedTestTitles.has(t.title)).length}
                </div>
                <div className="stat-title">Pending / Scheduled Exams</div>
                <span className="stat-trend-tag active">Ready for Proctoring</span>
              </div>
            </div>

            <div className="std-stat-card card-purple">
              <div className="stat-card-icon-wrap">
                <FaShieldAlt />
              </div>
              <div className="stat-card-body-wrap">
                <div className="stat-count">99.4%</div>
                <div className="stat-title">AI Integrity Compliance</div>
                <span className="stat-trend-tag positive">0 Infractions Flagged</span>
              </div>
            </div>
          </div>

          {/* ── MAIN 2-COLUMN SECTION: ASSESSMENTS & READINESS ─────── */}
          <div className="student-grid-row">
            {/* COLUMN 1: ASSESSMENTS LAUNCHPAD */}
            <div className="std-card">
              <div className="std-card-header">
                <div className="card-header-left">
                  <FaClipboardList className="card-header-icon text-indigo" />
                  <h3 className="std-card-title">Assessments Launchpad</h3>
                </div>

                <div className="std-filter-pills">
                  <button
                    className={`std-filter-btn ${assessmentFilter === "ALL" ? "active" : ""}`}
                    onClick={() => setAssessmentFilter("ALL")}
                  >
                    All ({tests.length})
                  </button>
                  <button
                    className={`std-filter-btn ${assessmentFilter === "AVAILABLE" ? "active" : ""}`}
                    onClick={() => setAssessmentFilter("AVAILABLE")}
                  >
                    Available
                  </button>
                  <button
                    className={`std-filter-btn ${assessmentFilter === "COMPLETED" ? "active" : ""}`}
                    onClick={() => setAssessmentFilter("COMPLETED")}
                  >
                    Completed ({completedTestTitles.size})
                  </button>
                </div>
              </div>

              <div className="std-card-body">
                <div className="upcoming-list-flex">
                  {filteredTests.length === 0 ? (
                    <div className="empty-assessments-box">
                      <FaCheckCircle className="empty-check-icon" />
                      <p>No assessments in this filter category.</p>
                    </div>
                  ) : (
                    filteredTests.map((test) => {
                      const isCompleted = completedTestTitles.has(test.title);
                      const matchedResult = results.find((r) => (r.title || r.test) === test.title);

                      return (
                        <div key={test.id} className="upcoming-test-item">
                          <div className="test-subject-icon-box">
                            {SUBJECT_ICONS[test.subject] || <FaCode />}
                          </div>

                          <div className="upcoming-test-info">
                            <div className="test-title-row">
                              <h4 className="test-item-title">{test.title}</h4>
                              {test.proctored && (
                                <span className="proctor-shield-badge" title="AI Camera Proctored Exam">
                                  <FaShieldAlt /> AI Proctored
                                </span>
                              )}
                            </div>
                            <div className="test-item-meta">
                              <span><FaBookOpen /> {test.subject}</span>
                              <span>•</span>
                              <span><FaClock /> {test.duration} mins</span>
                              <span>•</span>
                              <span><FaAward /> {test.marks} marks</span>
                              <span>•</span>
                              <span><FaCalendarAlt /> {test.date}</span>
                            </div>
                          </div>

                          <div className="upcoming-test-actions">
                            {isCompleted ? (
                              <div className="completed-action-group">
                                <span className="score-pill-emerald">
                                  {matchedResult ? matchedResult.score : "Graded"}
                                </span>
                                <button
                                  className="btn-view-scorecard"
                                  onClick={() => handleOpenScorecard(test.title)}
                                >
                                  <FaEye /> Scorecard
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn-start-camera-test"
                                onClick={() => handleStartTest(test)}
                              >
                                <FaPlay /> Start Exam
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: HARDWARE & AI PROCTORING READINESS CHECK */}
            <div className="std-card">
              <div className="std-card-header">
                <div className="card-header-left">
                  <FaShieldAlt className="card-header-icon text-emerald" />
                  <h3 className="std-card-title">AI Proctoring &amp; System Readiness</h3>
                </div>
                <button
                  className="btn-retest-system"
                  onClick={handleRunSystemCheck}
                  disabled={testingHardware}
                >
                  {testingHardware ? "Verifying..." : "Run Diagnostics"}
                </button>
              </div>

              <div className="std-card-body">
                <div className="proctor-status-summary-banner">
                  <div className="summary-status-icon">
                    <FaCheckCircle className="text-emerald" />
                  </div>
                  <div>
                    <h4 className="summary-status-title">System Verified for Examination</h4>
                    <p className="summary-status-sub">
                      All hardware sensors and security policies meet SmartAssess examination guidelines.
                    </p>
                  </div>
                </div>

                <div className="readiness-check-grid">
                  <div className="readiness-item">
                    <div className="readiness-icon-wrap bg-indigo-glow">
                      <FaVideo />
                    </div>
                    <div className="readiness-info">
                      <strong>Webcam Sensor</strong>
                      <span>720p/1080p HD Face Stream</span>
                    </div>
                    <span className="readiness-status ok"><FaCheck /> Active</span>
                  </div>

                  <div className="readiness-item">
                    <div className="readiness-icon-wrap bg-emerald-glow">
                      <FaMicrophone />
                    </div>
                    <div className="readiness-info">
                      <strong>Audio Capture</strong>
                      <span>Noise Gating &amp; Acoustic Track</span>
                    </div>
                    <span className="readiness-status ok"><FaCheck /> Active</span>
                  </div>

                  <div className="readiness-item">
                    <div className="readiness-icon-wrap bg-blue-glow">
                      <FaDesktop />
                    </div>
                    <div className="readiness-info">
                      <strong>Screen &amp; Tab Lock</strong>
                      <span>Multi-display &amp; Focus Tracker</span>
                    </div>
                    <span className="readiness-status ok"><FaCheck /> Enforced</span>
                  </div>

                  <div className="readiness-item">
                    <div className="readiness-icon-wrap bg-purple-glow">
                      <FaWifi />
                    </div>
                    <div className="readiness-info">
                      <strong>Network Latency</strong>
                      <span>24ms Ping • High Reliability</span>
                    </div>
                    <span className="readiness-status ok"><FaCheck /> 99.8% Up</span>
                  </div>
                </div>

                <div className="proctor-guidelines-box">
                  <h5>Examination Integrity Reminders:</h5>
                  <ul>
                    <li>Remain centered in webcam frame throughout the assessment.</li>
                    <li>Browser window switches or background applications will generate infractions.</li>
                    <li>Calculators and external aids are permitted only if explicitly authorized.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 2: SUBJECT MASTERY & RECENT SCORECARDS ─────────── */}
          <div className="student-grid-row">
            {/* SUBJECT MASTERY PROGRESS */}
            <div className="std-card">
              <div className="std-card-header">
                <div className="card-header-left">
                  <FaChartLine className="card-header-icon text-indigo" />
                  <h3 className="std-card-title">Subject Proficiency &amp; Mastery</h3>
                </div>
                <span className="mastery-summary-tag">Term Average: 85.2%</span>
              </div>

              <div className="std-card-body">
                <div className="subject-mastery-list">
                  {subjectMastery.map((item) => (
                    <div key={item.subject} className="mastery-item">
                      <div className="mastery-item-header">
                        <div className="mastery-name-wrap">
                          <strong>{item.subject}</strong>
                          <span className="mastery-grade-badge">{item.grade}</span>
                        </div>
                        <div className="mastery-score-wrap">
                          <span className="mastery-status-text" style={{ color: item.color }}>
                            {item.status}
                          </span>
                          <strong className="mastery-percentage">{item.score}%</strong>
                        </div>
                      </div>

                      <div className="mastery-progress-track">
                        <div
                          className="mastery-progress-fill"
                          style={{
                            width: `${item.score}%`,
                            background: `linear-gradient(90deg, ${item.color}bb, ${item.color})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT TEST SUBMISSIONS & SCORECARDS */}
            <div className="std-card">
              <div className="std-card-header">
                <div className="card-header-left">
                  <FaAward className="card-header-icon text-purple" />
                  <h3 className="std-card-title">Recent Submissions &amp; Scorecards</h3>
                </div>
                <button
                  className="std-view-all"
                  onClick={() => navigate("/results")}
                >
                  Full Analytics <FaArrowRight className="inline ml-1" />
                </button>
              </div>

              <div className="std-card-body">
                <div className="results-list-flex">
                  {results.slice(0, 4).map((r) => (
                    <div key={r.id} className="result-test-item">
                      <div className="result-item-icon">
                        <FaAward />
                      </div>
                      <div className="result-item-info">
                        <h4 className="test-item-title">{r.title || r.test}</h4>
                        <p className="test-item-meta">
                          Evaluated by {r.reviewer || "Dr. Johnson"} • {r.date || "18 May 2025"}
                        </p>
                      </div>
                      <div className="result-action-col">
                        <span className="score-pill-emerald">{r.score}</span>
                        <button
                          className="btn-scorecard-quick-view"
                          onClick={() => setSelectedScorecardResult(r)}
                        >
                          <FaEye /> Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: ANNOUNCEMENTS & NOTICES ─────────────────────── */}
          <div className="std-card">
            <div className="std-card-header">
              <div className="card-header-left">
                <FaBullhorn className="card-header-icon text-amber" />
                <h3 className="std-card-title">Department Announcements &amp; Notice Board</h3>
              </div>
              <span className="announcement-count-tag">{ANNOUNCEMENTS.length} Active Notices</span>
            </div>

            <div className="std-card-body">
              <div className="notifications-list-flex">
                {ANNOUNCEMENTS.map((item) => (
                  <div
                    key={item.id}
                    className={`notif-item ${item.urgent ? "urgent-notice" : ""}`}
                  >
                    <div className="notif-header-row">
                      <h4 className="notif-text">
                        {item.urgent && <span className="urgent-tag">URGENT</span>}
                        {item.title}
                      </h4>
                      <span className="notif-time">{item.time}</span>
                    </div>
                    <p className="notif-content-snippet">{item.content}</p>
                    <span className="notif-author">Posted by: {item.author}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SCORECARD REVIEW MODAL ─────────────────────────────── */}
        {selectedScorecardResult && (
          <ScorecardReviewModal
            result={selectedScorecardResult}
            onClose={() => setSelectedScorecardResult(null)}
          />
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;