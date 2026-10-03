import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FaRobot,
  FaQuestionCircle,
  FaUser,
  FaBullhorn,
  FaCog,
  FaTrash,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMagic,
  FaCheck,
  FaDownload,
  FaClock,
  FaSearch,
  FaFilter,
  FaLock,
  FaUnlock,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import GradeSubmissionModal from "../components/GradeSubmissionModal";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import { useTheme } from "../context/useTheme";
import { getUser, clearSession } from "../services/session";
import {
  getStoredTests,
  saveStoredTests,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredResults,
  saveStoredResults,
  nextId,
} from "../services/storage";
import API from "../services/api";
import "../styles/faculty.css";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Data Science",
  "Artificial Intelligence",
];

const RECENT_ACTIVITY = [
  { id: 1, text: "Assessment 'Java Programming Fundamentals' created", time: "1 hour ago", tone: "primary" },
  { id: 2, text: "Assessment 'DBMS Fundamentals' published", time: "1 day ago", tone: "green" },
  { id: 3, text: "Evaluated 15 student submissions", time: "2 days ago", tone: "blue" },
  { id: 4, text: "AI Question Generator produced 10 DSA questions", time: "3 days ago", tone: "amber" },
];

const INITIAL_MONITORING_RECORDS = [
  { id: 1, studentName: "Rahul Verma", testTitle: "Data Structures & Algorithms", event: "Multiple Faces Detected", severity: "High", timestamp: "Today, 11:32:05", status: "Flagged" },
  { id: 2, studentName: "Anjali Sharma", testTitle: "Java Programming Fundamentals", event: "Face Disappeared", severity: "Medium", timestamp: "Today, 14:18:10", status: "Reviewed" },
  { id: 3, studentName: "Vikram Singh", testTitle: "Web Development Mastery", event: "Window Blur / Tab Switch", severity: "Low", timestamp: "Yesterday, 16:04:22", status: "Cleared" },
  { id: 4, studentName: "Neha Gupta", testTitle: "DBMS Fundamentals", event: "Multiple Faces Detected", severity: "High", timestamp: "2 days ago, 17:35:01", status: "Flagged" },
];

const INITIAL_ANNOUNCEMENTS = [
  { id: 1, title: "Mid-term Examination Schedule", date: "20 May 2025", content: "The official schedule for 4th-semester midterms has been updated. Please check test start times.", urgent: true },
  { id: 2, title: "Re-attempt Policy for Java", date: "18 May 2025", content: "Students who hit connectivity issues during mock sessions may request a re-attempt from faculty.", urgent: false },
];

const isPending = (s) => String(s?.status ?? "").includes("Pending");

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const toasts = useToasts();
  const { userProfile, updateProfile } = useTheme();
  const user = getUser() || {};

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sync tab from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  // Storage states
  const [tests, setTests] = useState(() => getStoredTests());
  const [submissions, setSubmissions] = useState(() => getStoredSubmissions());
  const [results, setResults] = useState(() => getStoredResults());
  const [monitoringRecords, setMonitoringRecords] = useState(INITIAL_MONITORING_RECORDS);
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);

  // Selected item states
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Profile Form state
  const facultyName = userProfile?.name || user.name || "Faculty Member";
  const [profileForm, setProfileForm] = useState({
    name: facultyName,
    email: userProfile?.email || user.email || "faculty@smartassess.edu",
    department: userProfile?.department || user.department || "Computer Science",
    phone: user.phone || "+91 98765 00000",
    designation: "Associate Professor",
    office: "Room 402, Academic Block B",
  });

  // Create Assessment state
  const [newTest, setNewTest] = useState({
    title: "",
    subject: "Java",
    description: "",
    duration: 60,
    marks: 100,
    passingMarks: 40,
    startDate: "2025-05-25",
    endDate: "2025-05-26",
    assignedStudents: "All Students",
    proctored: true,
  });

  // Question Management state
  const [selectedTestId, setSelectedTestId] = useState(tests[0]?.id || 1);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    marks: 10,
    difficulty: "Medium",
  });
  const [testQuestions, setTestQuestions] = useState([
    { id: 1, text: "Which data structure uses LIFO ordering?", options: ["Queue", "Stack", "Tree", "Graph"], correct: "Stack", marks: 10, difficulty: "Easy" },
    { id: 2, text: "What is the worst-case time complexity of QuickSort?", options: ["O(n log n)", "O(n)", "O(n²)", "O(1)"], correct: "O(n²)", marks: 10, difficulty: "Medium" },
  ]);

  // AI Question Generator state
  const [aiTopic, setAiTopic] = useState("Object Oriented Programming in Java");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiCount, setAiCount] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // Students state (from backend API or fallback)
  const [assignedStudentsList, setAssignedStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  // New Announcement state
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnUrgent, setNewAnnUrgent] = useState(false);

  // Load students from API
  useEffect(() => {
    API.get("/students")
      .then((res) => {
        if (Array.isArray(res.data)) setAssignedStudentsList(res.data);
      })
      .catch(() => {
        setAssignedStudentsList([
          { _id: "s1", name: "Rahul Verma", rollNumber: "CSE-2022-084", email: "rahul.verma@student.com", department: "Computer Science", semester: 4, status: "Active" },
          { _id: "s2", name: "Anjali Sharma", rollNumber: "CSE-2022-042", email: "anjali.s@student.com", department: "Computer Science", semester: 4, status: "Active" },
          { _id: "s3", name: "Vikram Singh", rollNumber: "IT-2022-019", email: "vikram.s@student.com", department: "Information Technology", semester: 6, status: "Active" },
          { _id: "s4", name: "Neha Gupta", rollNumber: "DS-2023-011", email: "neha.g@student.com", department: "Data Science", semester: 2, status: "Active" },
        ]);
      });
  }, []);

  // Calculated Stats
  const pendingCount = useMemo(() => submissions.filter(isPending).length, [submissions]);
  const activeAssessments = useMemo(() => tests.filter((t) => t.status === "Published").length, [tests]);
  const completedAssessments = useMemo(() => tests.filter((t) => t.status === "Completed" || t.attempts > 0).length, [tests]);
  const totalStudentsCount = assignedStudentsList.length || 42;

  // Handler: Save New Assessment
  const handleCreateTest = (e) => {
    e.preventDefault();
    if (!newTest.title.trim()) {
      toasts.error("Assessment title is required.");
      return;
    }
    const created = {
      id: nextId(),
      title: newTest.title.trim(),
      subject: newTest.subject,
      description: newTest.description,
      date: newTest.startDate,
      duration: Number(newTest.duration) || 60,
      marks: Number(newTest.marks) || 100,
      passingMarks: Number(newTest.passingMarks) || 40,
      status: "Published",
      students: totalStudentsCount,
      attempts: 0,
      proctored: newTest.proctored,
    };
    const updated = [created, ...tests];
    setTests(updated);
    saveStoredTests(updated);
    toasts.success(`Assessment "${created.title}" created and published!`);
    setNewTest({
      title: "",
      subject: "Java",
      description: "",
      duration: 60,
      marks: 100,
      passingMarks: 40,
      startDate: "2025-05-25",
      endDate: "2025-05-26",
      assignedStudents: "All Students",
      proctored: true,
    });
    setActiveTab("manage-tests");
  };

  // Handler: Toggle Publish / Delete Assessment
  const handleTogglePublish = (id) => {
    const updated = tests.map((t) =>
      t.id === id ? { ...t, status: t.status === "Published" ? "Draft" : "Published" } : t
    );
    setTests(updated);
    saveStoredTests(updated);
    toasts.info("Assessment status updated.");
  };

  const handleDeleteTest = (id) => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;
    const updated = tests.filter((t) => t.id !== id);
    setTests(updated);
    saveStoredTests(updated);
    toasts.success("Assessment deleted.");
  };

  // Handler: Add Question manually
  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.text.trim()) {
      toasts.error("Enter question text.");
      return;
    }
    const q = {
      id: Date.now(),
      text: newQuestion.text,
      options: [newQuestion.optionA || "Option A", newQuestion.optionB || "Option B", newQuestion.optionC || "Option C", newQuestion.optionD || "Option D"],
      correct: newQuestion.correctAnswer,
      marks: Number(newQuestion.marks) || 10,
      difficulty: newQuestion.difficulty,
    };
    setTestQuestions([...testQuestions, q]);
    toasts.success("Question added successfully!");
    setNewQuestion({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", marks: 10, difficulty: "Medium" });
  };

  // Handler: AI Question Generation
  const handleGenerateAI = () => {
    setAiLoading(true);
    setTimeout(() => {
      const generated = [
        {
          id: Date.now() + 1,
          text: `In ${aiTopic}, which mechanism provides runtime polymorphism?`,
          options: ["Method Overriding", "Method Overloading", "Encapsulation", "Abstract Classes"],
          correct: "Method Overriding",
          explanation: "Method overriding lets a subclass provide a specific implementation of a method declared in its superclass at runtime.",
          approved: false,
        },
        {
          id: Date.now() + 2,
          text: `What is the primary advantage of using immutable objects in ${aiTopic}?`,
          options: ["Thread Safety", "Faster Execution", "Lower Memory Usage", "Easier Inheritance"],
          correct: "Thread Safety",
          explanation: "Immutable objects cannot be modified after creation, eliminating data races across multiple threads.",
          approved: false,
        },
        {
          id: Date.now() + 3,
          text: `Which design pattern is most commonly used for event-driven architectures in ${aiTopic}?`,
          options: ["Observer Pattern", "Singleton Pattern", "Factory Pattern", "Adapter Pattern"],
          correct: "Observer Pattern",
          explanation: "The Observer pattern defines a 1-to-many dependency where state changes automatically notify all dependents.",
          approved: false,
        },
      ].slice(0, Math.min(Number(aiCount) || 3, 3));
      setGeneratedQuestions(generated);
      setAiLoading(false);
      toasts.success(`Generated ${generated.length} AI questions on "${aiTopic}"!`);
    }, 1200);
  };

  const handleApproveAIQuestion = (qId) => {
    const target = generatedQuestions.find((q) => q.id === qId);
    if (!target) return;
    setTestQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: target.text,
        options: target.options,
        correct: target.correct,
        marks: 10,
        difficulty: aiDifficulty,
      },
    ]);
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== qId));
    toasts.success("Question approved and added to Question Management!");
  };

  // Handler: Grade Submission Update
  const handleGradeUpdate = useCallback(
    (graded) => {
      const updatedSubs = submissions.map((s) =>
        s.id === graded.id
          ? {
              ...s,
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

      const percent = graded.maxScore > 0 ? Math.round((graded.totalScore / graded.maxScore) * 100) : 0;
      const currentResults = getStoredResults();
      const newResult = {
        id: nextId(),
        testId: graded.testId,
        title: graded.testTitle || "Assessment",
        test: graded.testTitle || "Assessment",
        subject: graded.subject || "Computer Science",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        score: `${percent}%`,
        percent,
        student: graded.studentName,
        studentEmail: graded.studentEmail,
        reviewer: facultyName,
      };

      const withoutOld = currentResults.filter(
        (r) => !(r.studentEmail === graded.studentEmail && (r.testId === graded.testId || r.title === graded.testTitle))
      );
      const updatedResults = [newResult, ...withoutOld];
      setResults(updatedResults);
      saveStoredResults(updatedResults);

      toasts.success(`Published score (${percent}%) for ${graded.studentName}.`);
    },
    [submissions, facultyName, toasts]
  );

  // Handler: Add Announcement
  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      toasts.error("Title and content are required.");
      return;
    }
    const item = {
      id: Date.now(),
      title: newAnnTitle.trim(),
      content: newAnnContent.trim(),
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      urgent: newAnnUrgent,
    };
    setAnnouncements([item, ...announcements]);
    setNewAnnTitle("");
    setNewAnnContent("");
    setNewAnnUrgent(false);
    toasts.success("Announcement posted!");
  };

  // Handler: Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      name: profileForm.name,
      email: profileForm.email,
      department: profileForm.department,
    });
    toasts.success("Faculty profile updated!");
  };

  // Handler: Logout
  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell dark-theme-root">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Faculty Portal"
          subtitle={`${facultyName} · ${profileForm.department}`}
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          {/* Top Faculty Navigation Tabs */}
          <div className="fac-nav-tabs-wrap" style={{ marginBottom: "20px", overflowX: "auto" }}>
            <div className="tabs" style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
              {[
                { key: "dashboard", label: "Dashboard", icon: <FaChalkboardTeacher /> },
                { key: "create-test", label: "Create Assessment", icon: <FaPlus /> },
                { key: "manage-tests", label: "Manage Assessments", icon: <FaFileAlt /> },
                { key: "questions", label: "Question Management", icon: <FaQuestionCircle /> },
                { key: "ai-gen", label: "AI Question Gen", icon: <FaRobot /> },
                { key: "grading", label: "Evaluation & Grading", icon: <FaClipboardCheck /> },
                { key: "results", label: "Results", icon: <FaAward /> },
                { key: "analytics", label: "Analytics", icon: <FaChartBar /> },
                { key: "monitoring", label: "Monitoring Logs", icon: <FaShieldAlt /> },
                { key: "students", label: "Assigned Students", icon: <FaUsers /> },
                { key: "announcements", label: "Announcements", icon: <FaBullhorn /> },
                { key: "profile", label: "My Profile", icon: <FaUser /> },
                { key: "settings", label: "Settings", icon: <FaCog /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tab ${activeTab === t.key ? "is-active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                  style={{ whiteSpace: "nowrap", padding: "8px 14px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {t.icon} {t.label}
                  {t.key === "grading" && pendingCount > 0 && (
                    <span className="badge badge-warning" style={{ marginLeft: "4px", padding: "2px 6px" }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 1: FACULTY DASHBOARD OVERVIEW */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="fac-tab-content">
              {/* Hero */}
              <section className="fac-hero">
                <div className="fac-hero-text">
                  <span className="fac-hero-badge">
                    <FaChalkboardTeacher /> Faculty Workspace
                  </span>
                  <h2 className="fac-hero-title">Good to see you, {facultyName.split(" ")[0]}.</h2>
                  <p className="fac-hero-sub">
                    {pendingCount > 0 ? (
                      <>
                        You have <strong>{pendingCount}</strong> student submission
                        {pendingCount === 1 ? "" : "s"} waiting for evaluation.
                      </>
                    ) : (
                      <>All student attempts are evaluated and published.</>
                    )}
                  </p>
                </div>
                <div className="fac-hero-actions">
                  <button className="btn btn-primary" onClick={() => setActiveTab("create-test")}>
                    <FaPlus /> Create Assessment
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab("ai-gen")}>
                    <FaRobot /> Generate AI Questions
                  </button>
                  <button className="btn btn-ghost" onClick={() => setActiveTab("analytics")}>
                    <FaChartBar /> Analytics
                  </button>
                </div>
              </section>

              {/* Stat Tiles */}
              <div className="stat-grid" style={{ marginTop: "20px" }}>
                <Tile tone="tile-teal" icon={<FaFileAlt />} value={tests.length} label="Total Assessments" />
                <Tile tone="tile-blue" icon={<FaCalendarAlt />} value={activeAssessments} label="Active Assessments" />
                <Tile tone="tile-green" icon={<FaCheckCircle />} value={completedAssessments} label="Completed Assessments" />
                <Tile tone="tile-indigo" icon={<FaUsers />} value={totalStudentsCount} label="Total Students" />
                <Tile
                  tone={pendingCount > 0 ? "tile-amber" : "tile-green"}
                  icon={<FaClipboardCheck />}
                  value={pendingCount}
                  label="Pending Evaluations"
                />
              </div>

              {/* Submissions Pending Table */}
              <section className="card" style={{ marginTop: "24px" }}>
                <div className="card-head">
                  <div className="card-head-left">
                    <FaAward className="card-head-icon" />
                    <div>
                      <h3 className="card-title">Recent Submissions for Grading</h3>
                      <p className="card-subtitle">
                        {pendingCount} pending · {submissions.length} total student submissions
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab("grading")}>
                    View All <FaArrowRight />
                  </button>
                </div>

                <div className="table-wrap">
                  {submissions.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon"><FaClipboardCheck /></span>
                      <p className="empty-title">No submissions recorded</p>
                      <p className="empty-text">Student attempts will show up here as tests are completed.</p>
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
                        {submissions.slice(0, 5).map((s) => {
                          const pending = isPending(s);
                          return (
                            <tr key={s.id}>
                              <td>
                                <div className="cell-user">
                                  <span className="avatar avatar-sm avatar-student">{initials(s.studentName)}</span>
                                  <span className="cell-user-text">
                                    <span className="cell-user-name">{s.studentName}</span>
                                    <span className="cell-user-sub">{s.studentEmail}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="td-clip">{s.testTitle}</td>
                              <td className="text-sm text-muted">{s.date}</td>
                              <td className="td-strong tabular">{s.score}</td>
                              <td>
                                <span className={`badge ${pending ? "badge-warning" : "badge-success"}`}>
                                  {pending ? "Pending" : "Published"}
                                </span>
                              </td>
                              <td className="td-actions">
                                <button
                                  className={`btn btn-sm ${pending ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setSelectedSubmission(s)}
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

              {/* Bottom split: Scheduled & Activity */}
              <div className="grid-2" style={{ marginTop: "24px" }}>
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaCalendarAlt className="card-head-icon" />
                      <h3 className="card-title">Scheduled Assessments</h3>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("manage-tests")}>
                      Manage <FaArrowRight />
                    </button>
                  </div>
                  <div className="card-body-flush">
                    {tests.slice(0, 4).map((t) => (
                      <div key={t.id} className="fac-test-row">
                        <div className="fac-test-info">
                          <strong>{t.title}</strong>
                          <span>
                            {t.subject} · {t.duration} min · {t.marks} marks · {t.date}
                          </span>
                        </div>
                        <span className={`badge ${t.status === "Published" ? "badge-success" : "badge-info"}`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaShieldAlt className="card-head-icon" />
                      <h3 className="card-title">Recent Activity</h3>
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
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 2: MY PROFILE */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaUser className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Faculty Profile</h3>
                    <p className="card-subtitle">Manage your personal & academic information</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={handleSaveProfile} className="stack">
                  <div className="field">
                    <label className="field-label">Full Name</label>
                    <input
                      className="input"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Email Address</label>
                    <input
                      className="input"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Department</label>
                      <select
                        className="select"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Designation</label>
                      <input
                        className="input"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Contact Phone</label>
                      <input
                        className="input"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Office Location</label>
                      <input
                        className="input"
                        value={profileForm.office}
                        onChange={(e) => setProfileForm({ ...profileForm, office: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-foot" style={{ padding: 0, marginTop: "16px" }}>
                    <button type="submit" className="btn btn-primary">
                      <FaCheck /> Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 3: CREATE ASSESSMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "create-test" && (
            <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaPlus className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Create New Assessment</h3>
                    <p className="card-subtitle">Set test parameters, total marks, duration and assigned students</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateTest} className="stack">
                  <div className="field">
                    <label className="field-label">Assessment Title *</label>
                    <input
                      className="input"
                      placeholder="e.g. Midterm Examination - Java & OOP"
                      value={newTest.title}
                      onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Subject / Course</label>
                      <select
                        className="select"
                        value={newTest.subject}
                        onChange={(e) => setNewTest({ ...newTest, subject: e.target.value })}
                      >
                        <option value="Java">Java Programming</option>
                        <option value="DSA">Data Structures & Algorithms</option>
                        <option value="Web Dev">Web Development</option>
                        <option value="DBMS">Database Management Systems</option>
                        <option value="OS">Operating Systems</option>
                        <option value="CN">Computer Networks</option>
                        <option value="Python">Python Programming</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Duration (Minutes)</label>
                      <input
                        className="input"
                        type="number"
                        min="15"
                        max="300"
                        value={newTest.duration}
                        onChange={(e) => setNewTest({ ...newTest, duration: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Description / Instructions</label>
                    <textarea
                      className="input"
                      rows="3"
                      placeholder="Provide student guidelines, allowed materials, and instructions..."
                      value={newTest.description}
                      onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Total Marks</label>
                      <input
                        className="input"
                        type="number"
                        value={newTest.marks}
                        onChange={(e) => setNewTest({ ...newTest, marks: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Passing Marks</label>
                      <input
                        className="input"
                        type="number"
                        value={newTest.passingMarks}
                        onChange={(e) => setNewTest({ ...newTest, passingMarks: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Start Date & Time</label>
                      <input
                        className="input"
                        type="date"
                        value={newTest.startDate}
                        onChange={(e) => setNewTest({ ...newTest, startDate: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">End Date & Time</label>
                      <input
                        className="input"
                        type="date"
                        value={newTest.endDate}
                        onChange={(e) => setNewTest({ ...newTest, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Assigned Students Cohort</label>
                      <select
                        className="select"
                        value={newTest.assignedStudents}
                        onChange={(e) => setNewTest({ ...newTest, assignedStudents: e.target.value })}
                      >
                        <option value="All Students">All Enrolled Students ({totalStudentsCount})</option>
                        <option value="Computer Science">Computer Science Dept</option>
                        <option value="Information Technology">Information Tech Dept</option>
                        <option value="Data Science">Data Science Dept</option>
                      </select>
                    </div>
                    <div className="field" style={{ justifyContent: "center", display: "flex", flexDirection: "column" }}>
                      <label className="field-label">AI Proctoring Mode</label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={newTest.proctored}
                          onChange={(e) => setNewTest({ ...newTest, proctored: e.target.checked })}
                        />
                        <span className="text-sm">Enable Live Face & Multi-Person AI Proctoring</span>
                      </label>
                    </div>
                  </div>

                  <div className="modal-foot" style={{ padding: 0, marginTop: "20px" }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("manage-tests")}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <FaPlus /> Create &amp; Publish Assessment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 4: MANAGE ASSESSMENTS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "manage-tests" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaFileAlt className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Manage Assessments</h3>
                    <p className="card-subtitle">{tests.length} total assessments created</p>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("create-test")}>
                  <FaPlus /> New Assessment
                </button>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Duration</th>
                      <th>Marks</th>
                      <th>Schedule Date</th>
                      <th>Status</th>
                      <th>Proctored</th>
                      <th className="td-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td className="td-strong">{t.title}</td>
                        <td><span className="badge badge-primary">{t.subject}</span></td>
                        <td className="tabular">{t.duration} mins</td>
                        <td className="tabular">{t.marks}</td>
                        <td className="text-sm text-muted">{t.date}</td>
                        <td>
                          <span className={`badge ${t.status === "Published" ? "badge-success" : t.status === "Completed" ? "badge-info" : "badge-neutral"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.proctored ? (
                            <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                              <FaShieldAlt /> Active
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>Off</span>
                          )}
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleTogglePublish(t.id)}
                            title={t.status === "Published" ? "Unpublish" : "Publish"}
                          >
                            {t.status === "Published" ? <FaLock /> : <FaUnlock />}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setSelectedTestId(t.id); setActiveTab("questions"); }}
                          >
                            <FaQuestionCircle /> Questions
                          </button>
                          <button
                            className="btn btn-sm btn-danger-soft"
                            onClick={() => handleDeleteTest(t.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 5: QUESTION MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "questions" && (
            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaQuestionCircle className="card-head-icon" />
                    <div>
                      <h3 className="card-title">Question Management</h3>
                      <p className="card-subtitle">Add, edit, or delete questions for selected assessment</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="text-sm text-muted">Select Assessment:</label>
                    <select
                      className="select"
                      style={{ width: "auto" }}
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(Number(e.target.value))}
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>{t.title} ({t.subject})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="card-body">
                  <form onSubmit={handleAddQuestion} className="stack" style={{ background: "var(--bg-inset)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>➕ Add New Multiple Choice Question</h4>
                    <div className="field">
                      <label className="field-label">Question Text</label>
                      <input
                        className="input"
                        placeholder="Enter question statement..."
                        value={newQuestion.text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid-2">
                      <input className="input" placeholder="Option A" value={newQuestion.optionA} onChange={(e) => setNewQuestion({ ...newQuestion, optionA: e.target.value })} required />
                      <input className="input" placeholder="Option B" value={newQuestion.optionB} onChange={(e) => setNewQuestion({ ...newQuestion, optionB: e.target.value })} required />
                      <input className="input" placeholder="Option C" value={newQuestion.optionC} onChange={(e) => setNewQuestion({ ...newQuestion, optionC: e.target.value })} required />
                      <input className="input" placeholder="Option D" value={newQuestion.optionD} onChange={(e) => setNewQuestion({ ...newQuestion, optionD: e.target.value })} required />
                    </div>
                    <div className="grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                      <div className="field">
                        <label className="field-label">Correct Option</label>
                        <select className="select" value={newQuestion.correctAnswer} onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}>
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label">Marks</label>
                        <input className="input" type="number" value={newQuestion.marks} onChange={(e) => setNewQuestion({ ...newQuestion, marks: e.target.value })} />
                      </div>
                      <div className="field">
                        <label className="field-label">Difficulty Level</label>
                        <select className="select" value={newQuestion.difficulty} onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                      <FaPlus /> Save Question
                    </button>
                  </form>

                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "24px", marginBottom: "12px" }}>
                    Questions List ({testQuestions.length})
                  </h4>
                  <div className="stack-sm">
                    {testQuestions.map((q, idx) => (
                      <div key={q.id} className="card" style={{ padding: "14px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <strong>Q{idx + 1}. {q.text}</strong>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <span className="badge badge-info">{q.marks} Marks</span>
                            <span className="badge badge-neutral">{q.difficulty}</span>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setTestQuestions(testQuestions.filter((x) => x.id !== q.id))}
                            >
                              <FaTrash style={{ color: "var(--danger)" }} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.85rem" }}>
                          {q.options.map((opt, oIdx) => {
                            const isCorr = opt === q.correct || ["A", "B", "C", "D"][oIdx] === q.correct;
                            return (
                              <div
                                key={oIdx}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  background: isCorr ? "rgba(16, 185, 129, 0.12)" : "var(--bg-inset)",
                                  border: isCorr ? "1px solid var(--success)" : "1px solid transparent",
                                }}
                              >
                                <strong>{["A", "B", "C", "D"][oIdx]}:</strong> {opt} {isCorr && " ✓ (Correct)"}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 6: AI QUESTION GENERATION */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "ai-gen" && (
            <section className="card" style={{ maxWidth: "840px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaRobot className="card-head-icon" style={{ color: "var(--faculty-accent)" }} />
                  <div>
                    <h3 className="card-title">SmartAssess AI Question Generator</h3>
                    <p className="card-subtitle">Generate high-quality multiple choice questions instantly using AI</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", alignItems: "end" }}>
                  <div className="field">
                    <label className="field-label">Topic / Subject Keyword</label>
                    <input
                      className="input"
                      placeholder="e.g. Database Indexing, React Hooks, Graph Algorithms"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Difficulty</label>
                    <select className="select" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">No. of Questions</label>
                    <select className="select" value={aiCount} onChange={(e) => setAiCount(e.target.value)}>
                      <option value="1">1 Question</option>
                      <option value="3">3 Questions</option>
                      <option value="5">5 Questions</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  style={{ marginTop: "16px" }}
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <span className="spinner" /> AI is crafting questions…
                    </>
                  ) : (
                    <>
                      <FaMagic /> Generate Questions with AI
                    </>
                  )}
                </button>

                {generatedQuestions.length > 0 && (
                  <div style={{ marginTop: "24px" }} className="stack">
                    <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>Review &amp; Approve Generated Questions</h4>
                    {generatedQuestions.map((q, idx) => (
                      <div key={q.id} className="card" style={{ padding: "16px", border: "1px solid var(--faculty-accent)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                          <strong>AI Q{idx + 1}. {q.text}</strong>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApproveAIQuestion(q.id)}
                          >
                            <FaCheck /> Approve &amp; Save
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.85rem" }}>
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "4px",
                                background: opt === q.correct ? "rgba(16, 185, 129, 0.15)" : "var(--bg-inset)",
                                border: opt === q.correct ? "1px solid var(--success)" : "none",
                              }}
                            >
                              <strong>{["A", "B", "C", "D"][oIdx]}:</strong> {opt} {opt === q.correct && " ✓"}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-sm text-muted" style={{ marginTop: "8px", fontStyle: "italic" }}>
                            💡 <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 7: EVALUATION & GRADING */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "grading" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaClipboardCheck className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Evaluation &amp; Grading Queue</h3>
                    <p className="card-subtitle">Review student answers, assign marks, add feedback and publish scores</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assessment</th>
                      <th>Submitted Date</th>
                      <th>Automated Score</th>
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
                              <span className="avatar avatar-sm avatar-student">{initials(s.studentName)}</span>
                              <span className="cell-user-text">
                                <span className="cell-user-name">{s.studentName}</span>
                                <span className="cell-user-sub">{s.studentEmail}</span>
                              </span>
                            </div>
                          </td>
                          <td>{s.testTitle}</td>
                          <td className="text-sm text-muted">{s.date}</td>
                          <td className="td-strong tabular">{s.score}</td>
                          <td>
                            <span className={`badge ${pending ? "badge-warning" : "badge-success"}`}>
                              {pending ? "Pending Review" : "Graded & Published"}
                            </span>
                          </td>
                          <td className="td-actions">
                            <button
                              className={`btn btn-sm ${pending ? "btn-primary" : "btn-secondary"}`}
                              onClick={() => setSelectedSubmission(s)}
                            >
                              <FaEdit /> {pending ? "Grade Submission" : "Review Scorecard"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 8: RESULTS MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "results" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaAward className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Results Management</h3>
                    <p className="card-subtitle">Student-wise and assessment-wise performance records</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assessment</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Score %</th>
                      <th>Result Status</th>
                      <th>Reviewer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const pct = r.percent ?? (parseInt(r.score) || 0);
                      const passed = pct >= 40;
                      return (
                        <tr key={r.id}>
                          <td className="td-strong">{r.student}</td>
                          <td>{r.title || r.test}</td>
                          <td><span className="badge badge-neutral">{r.subject}</span></td>
                          <td className="text-sm text-muted">{r.date}</td>
                          <td className="td-strong tabular">{r.score}</td>
                          <td>
                            <span className={`badge ${passed ? "badge-success" : "badge-danger"}`}>
                              {passed ? "PASSED" : "FAILED"}
                            </span>
                          </td>
                          <td className="text-sm text-muted">{r.reviewer || facultyName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 9: PERFORMANCE ANALYTICS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <div className="stack">
              <div className="stat-grid">
                <Tile tone="tile-indigo" icon={<FaChartBar />} value="82%" label="Average Cohort Score" />
                <Tile tone="tile-green" icon={<FaAward />} value="95%" label="Highest Score" />
                <Tile tone="tile-teal" icon={<FaCheckCircle />} value="91.4%" label="Pass Percentage" />
                <Tile tone="tile-blue" icon={<FaUsers />} value={submissions.length} label="Total Graded Attempts" />
              </div>

              <section className="card" style={{ marginTop: "16px" }}>
                <div className="card-head">
                  <div className="card-head-left">
                    <FaChartBar className="card-head-icon" />
                    <h3 className="card-title">Subject Performance Breakdown</h3>
                  </div>
                </div>
                <div className="card-body stack">
                  {[
                    { subject: "Java Programming", avg: 85, pass: "94%" },
                    { subject: "Data Structures & Algorithms", avg: 78, pass: "88%" },
                    { subject: "DBMS Fundamentals", avg: 88, pass: "96%" },
                    { subject: "Web Development", avg: 80, pass: "90%" },
                  ].map((s) => (
                    <div key={s.subject} className="stack-sm">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                        <strong>{s.subject}</strong>
                        <span>Average: <strong>{s.avg}%</strong> | Pass Rate: {s.pass}</span>
                      </div>
                      <div className="progress-track" style={{ height: "10px" }}>
                        <div className="progress-fill is-success" style={{ width: `${s.avg}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 10: EXAMINATION MONITORING RECORDS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "monitoring" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaShieldAlt className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Examination Monitoring Records</h3>
                    <p className="card-subtitle">AI proctoring face detection events and integrity flags</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assessment</th>
                      <th>Detected Event</th>
                      <th>Severity</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoringRecords.map((m) => (
                      <tr key={m.id}>
                        <td className="td-strong">{m.studentName}</td>
                        <td>{m.testTitle}</td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FaExclamationTriangle style={{ color: m.severity === "High" ? "var(--danger)" : "var(--warning)" }} />
                            {m.event}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${m.severity === "High" ? "badge-danger" : m.severity === "Medium" ? "badge-warning" : "badge-neutral"}`}>
                            {m.severity}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{m.timestamp}</td>
                        <td>
                          <span className={`badge ${m.status === "Flagged" ? "badge-warning" : "badge-success"}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 11: ASSIGNED STUDENTS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "students" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaUsers className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Assigned Students Roster</h3>
                    <p className="card-subtitle">{assignedStudentsList.length} enrolled students</p>
                  </div>
                </div>
                <div className="input-wrap" style={{ width: "240px" }}>
                  <FaSearch />
                  <input
                    className="input"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Semester</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedStudentsList
                      .filter((s) => (s.name + s.email + s.rollNumber).toLowerCase().includes(studentSearch.toLowerCase()))
                      .map((s) => (
                        <tr key={s._id}>
                          <td className="tabular">{s.rollNumber || "CSE-2022-001"}</td>
                          <td className="td-strong">{s.name}</td>
                          <td>{s.email}</td>
                          <td>{s.department}</td>
                          <td className="tabular">Sem {s.semester || 4}</td>
                          <td>
                            <span className="badge badge-success">Active</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 12: ANNOUNCEMENTS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "announcements" && (
            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaBullhorn className="card-head-icon" />
                    <h3 className="card-title">Post New Announcement</h3>
                  </div>
                </div>
                <div className="card-body">
                  <form onSubmit={handleAddAnnouncement} className="stack">
                    <div className="field">
                      <label className="field-label">Announcement Title</label>
                      <input
                        className="input"
                        placeholder="e.g. Schedule update for Computer Networks exam"
                        value={newAnnTitle}
                        onChange={(e) => setNewAnnTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Announcement Details</label>
                      <textarea
                        className="input"
                        rows="3"
                        placeholder="Enter announcement text for students..."
                        value={newAnnContent}
                        onChange={(e) => setNewAnnContent(e.target.value)}
                        required
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input type="checkbox" checked={newAnnUrgent} onChange={(e) => setNewAnnUrgent(e.target.checked)} />
                      <span className="text-sm">Mark as Urgent Announcement</span>
                    </label>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                      <FaBullhorn /> Publish Announcement
                    </button>
                  </form>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div className="card-head-left">
                    <FaBullhorn className="card-head-icon" />
                    <h3 className="card-title">Past Announcements ({announcements.length})</h3>
                  </div>
                </div>
                <div className="card-body-flush">
                  {announcements.map((a) => (
                    <article key={a.id} className={`announce-item ${a.urgent ? "is-urgent" : ""}`}>
                      <div className="announce-body" style={{ width: "100%" }}>
                        <div className="announce-title-row">
                          <span className="announce-title">{a.title}</span>
                          {a.urgent && <span className="badge badge-danger">Urgent</span>}
                        </div>
                        <span className="announce-meta">{a.date}</span>
                        <p className="announce-text">{a.content}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 13: SETTINGS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaCog className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Faculty Workspace Settings</h3>
                    <p className="card-subtitle">Preferences and default configuration</p>
                  </div>
                </div>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label className="field-label">Default Assessment Duration</label>
                  <select className="select" defaultValue="60">
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">AI Proctoring Strictness</label>
                  <select className="select" defaultValue="Strict">
                    <option value="Standard">Standard (Warn on 2nd strike)</option>
                    <option value="Strict">Strict (Warn on 1st strike)</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Auto-Grading Objective Questions</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px" }}>
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Automatically grade MCQs upon student submit</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => toasts.success("Settings saved successfully!")}
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Grading */}
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
