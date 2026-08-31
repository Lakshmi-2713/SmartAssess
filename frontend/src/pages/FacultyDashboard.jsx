import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GradeSubmissionModal from "../components/GradeSubmissionModal";
import {
  FaFileAlt,
  FaCalendarAlt,
  FaUsers,
  FaClipboardCheck,
  FaPlus,
  FaLock,
  FaUserPlus,
  FaChalkboardTeacher,
  FaAward,
  FaCheckCircle,
  FaEdit,
} from "react-icons/fa";
import {
  getStoredTests,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredResults,
  saveStoredResults,
} from "../services/storage";
import "../styles/faculty.css";

const RECENT_ACTIVITIES = [
  { id: 1, text: "New test 'Java Programming' created", time: "1 hour ago", icon: FaPlus },
  { id: 2, text: "Test 'DBMS Fundamentals' published", time: "1 day ago", icon: FaLock },
  { id: 3, text: "Evaluated 15 student submissions", time: "2 days ago", icon: FaClipboardCheck },
  { id: 4, text: "New student batch registered", time: "3 days ago", icon: FaUserPlus },
];

function FacultyDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tests, setTests] = useState(() => getStoredTests());
  const [submissions, setSubmissions] = useState(() => getStoredSubmissions());
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    setTests(getStoredTests());
    setSubmissions(getStoredSubmissions());
  }, []);

  const upcomingTests = tests.filter((t) => t.status !== "Draft");

  // Stats data for Faculty
  const stats = [
    { id: 1, title: "Total Tests", count: String(tests.length), icon: FaFileAlt, colorClass: "card-emerald" },
    { id: 2, title: "Upcoming Tests", count: String(upcomingTests.length), icon: FaCalendarAlt, colorClass: "card-teal" },
    { id: 3, title: "Students Enrolled", count: "156", icon: FaUsers, colorClass: "card-cyan" },
    { id: 4, title: "Pending Evaluations", count: String(submissions.filter(s => s.status.includes("Pending")).length), icon: FaClipboardCheck, colorClass: "card-amber" },
  ];

  const handleGradeUpdate = (updatedSub) => {
    const updatedSubs = submissions.map((s) =>
      s.id === updatedSub.id
        ? {
            ...s,
            score: `${updatedSub.totalScore} / 100`,
            totalScore: updatedSub.totalScore,
            status: "Graded & Published",
            feedback: updatedSub.feedback,
            questions: updatedSub.questions,
          }
        : s
    );
    setSubmissions(updatedSubs);
    saveStoredSubmissions(updatedSubs);

    // Sync to results list for student scorecard review
    const results = getStoredResults();
    const newResult = {
      id: Date.now(),
      title: updatedSub.testTitle || "Assessment",
      test: updatedSub.testTitle || "Assessment",
      subject: "Computer Science",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      score: `${updatedSub.totalScore}%`,
      student: updatedSub.studentName || "Rahul Verma",
      reviewer: "Dr. Johnson",
    };
    const updatedResults = [newResult, ...results.filter(r => r.title !== updatedSub.testTitle)];
    saveStoredResults(updatedResults);
  };

  return (
    <div className="faculty-layout-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="faculty-main-content">
        <Navbar
          title="Faculty Dashboard"
          subtitle="Dr. Johnson • Computer Science Department"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="faculty-dashboard-body">
          {/* Distinct Role Header Banner for Faculty */}
          <div className="role-badge-header faculty-mode">
            <div className="flex items-center gap-3">
              <FaChalkboardTeacher className="text-xl text-emerald-400" />
              <div>
                <span className="font-bold text-white text-base">FACULTY WORKSPACE</span>
                <p className="text-xs text-slate-300">Test Creation, Automated Grading & Student Performance Oversight</p>
              </div>
            </div>
            <span className="role-pill-tag">FACULTY PORTAL</span>
          </div>

          {/* STATS CARDS ROW */}
          <div className="faculty-stats-grid">
            {stats.map((st) => {
              const IconComp = st.icon;
              return (
                <div key={st.id} className={`fac-stat-card ${st.colorClass}`}>
                  <div className="stat-card-icon-wrap">
                    <IconComp />
                  </div>
                  <div className="stat-card-info">
                    <h3 className="stat-count">{st.count}</h3>
                    <p className="stat-title">{st.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FEATURE 1 FOR FACULTY: Student Submissions Evaluation & Correction */}
          <div className="fac-card pending-evaluations-card">
            <div className="fac-card-header">
              <div className="flex items-center gap-2">
                <FaAward className="text-emerald-400" />
                <h3 className="fac-card-title">Student Test Submissions for Correction</h3>
              </div>
              <span className="badge-enrolled">{submissions.filter(s => s.status.includes("Pending")).length} Pending Review</span>
            </div>
            <div className="fac-card-body table-responsive">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Test Title</th>
                    <th>Date Submitted</th>
                    <th>Current Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="font-semibold text-white">{sub.studentName}</td>
                      <td className="text-slate-300">{sub.testTitle}</td>
                      <td>{sub.date}</td>
                      <td className="font-bold text-emerald-400">{sub.score}</td>
                      <td>
                        <span className={`status-pill ${sub.status.includes("Pending") ? "upcoming" : "published"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-evaluate-sm"
                          onClick={() => setSelectedSubmission(sub)}
                        >
                          <FaEdit /> Correct &amp; Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ROW 1: Upcoming Tests & Recent Activities */}
          <div className="faculty-grid-row">
            {/* Upcoming Tests Table Card */}
            <div className="fac-card upcoming-tests-card">
              <div className="fac-card-header">
                <h3 className="fac-card-title">Upcoming Assessments</h3>
                <a href="/tests" className="fac-view-all">Manage Tests →</a>
              </div>
              <div className="fac-card-body table-responsive">
                <table className="fac-table">
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingTests.slice(0, 5).map((t) => (
                      <tr key={t.id}>
                        <td className="font-semibold text-emerald-400">{t.title}</td>
                        <td>{t.date || "20 May 2025"}</td>
                        <td>{t.duration} Mins</td>
                        <td><span className="badge-enrolled">{t.students || 40} Students</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activities List Card */}
            <div className="fac-card recent-activities-card">
              <div className="fac-card-header">
                <h3 className="fac-card-title">Recent Activity Logs</h3>
              </div>
              <div className="fac-card-body">
                <div className="activity-list">
                  {RECENT_ACTIVITIES.map((act) => {
                    const ActIcon = act.icon;
                    return (
                      <div key={act.id} className="activity-item">
                        <div className="activity-icon-badge">
                          <ActIcon />
                        </div>
                        <div className="activity-text-wrap">
                          <p className="activity-desc">{act.text}</p>
                          <span className="activity-time">{act.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Tests Overview (Donut Chart) & Performance Overview (Line Chart) */}
          <div className="faculty-grid-row">
            {/* Tests Overview Donut Chart */}
            <div className="fac-card tests-overview-card">
              <div className="fac-card-header">
                <h3 className="fac-card-title">Tests Status Overview</h3>
              </div>
              <div className="fac-card-body donut-chart-container">
                <div className="donut-chart-svg-wrap">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="114 125" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#06b6d4" strokeWidth="16" strokeDasharray="76 163" strokeDashoffset="-114" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#64748b" strokeWidth="16" strokeDasharray="48 191" strokeDashoffset="-190" />
                  </svg>
                </div>
                <div className="chart-legend-list">
                  <div className="legend-item">
                    <span className="legend-dot published-dot"></span>
                    <span className="legend-label">Published</span>
                    <span className="legend-val">12</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot upcoming-dot"></span>
                    <span className="legend-label">Upcoming</span>
                    <span className="legend-val">8</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot draft-dot"></span>
                    <span className="legend-label">Draft</span>
                    <span className="legend-val">5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Overview Line Chart */}
            <div className="fac-card performance-overview-card">
              <div className="fac-card-header">
                <h3 className="fac-card-title">Class Average Score Trend</h3>
              </div>
              <div className="fac-card-body line-chart-container">
                <div className="line-chart-svg-wrap">
                  <svg viewBox="0 0 500 200" className="line-chart-svg">
                    <line x1="40" y1="30" x2="480" y2="30" stroke="#273552" strokeWidth="1" />
                    <line x1="40" y1="75" x2="480" y2="75" stroke="#273552" strokeWidth="1" />
                    <line x1="40" y1="120" x2="480" y2="120" stroke="#273552" strokeWidth="1" />
                    <line x1="40" y1="165" x2="480" y2="165" stroke="#273552" strokeWidth="1" />
                    <text x="10" y="35" fill="#94a3b8" fontSize="10">100%</text>
                    <text x="15" y="78" fill="#94a3b8" fontSize="10">75%</text>
                    <text x="15" y="123" fill="#94a3b8" fontSize="10">50%</text>
                    <text x="15" y="168" fill="#94a3b8" fontSize="10">25%</text>

                    <path d="M 60 110 L 150 140 L 250 85 L 350 100 L 450 55" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="60" cy="110" r="5" fill="#10b981" stroke="#141c2e" strokeWidth="2" />
                    <circle cx="150" cy="140" r="5" fill="#10b981" stroke="#141c2e" strokeWidth="2" />
                    <circle cx="250" cy="85" r="5" fill="#10b981" stroke="#141c2e" strokeWidth="2" />
                    <circle cx="350" cy="100" r="5" fill="#10b981" stroke="#141c2e" strokeWidth="2" />
                    <circle cx="450" cy="55" r="5" fill="#10b981" stroke="#141c2e" strokeWidth="2" />

                    <text x="50" y="190" fill="#94a3b8" fontSize="11">Jan</text>
                    <text x="140" y="190" fill="#94a3b8" fontSize="11">Feb</text>
                    <text x="240" y="190" fill="#94a3b8" fontSize="11">Mar</text>
                    <text x="340" y="190" fill="#94a3b8" fontSize="11">Apr</text>
                    <text x="440" y="190" fill="#94a3b8" fontSize="11">May</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Grade Submission Modal for Faculty */}
      {selectedSubmission && (
        <GradeSubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSaveGrade={handleGradeUpdate}
        />
      )}
    </div>
  );
}

export default FacultyDashboard;