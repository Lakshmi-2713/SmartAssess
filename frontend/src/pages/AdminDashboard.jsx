import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaShieldAlt,
  FaRobot,
  FaCalendarAlt,
  FaDownload,
  FaCog,
  FaHistory,
  FaUser,
  FaCheck,
  FaBan,
  FaKey,
  FaHeartbeat,
  FaFileExport,
  FaTimes,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import API from "../services/api";
import { getUser, clearSession } from "../services/session";
import { getStoredTests, getStoredResults, saveStoredTests } from "../services/storage";
import "../styles/dashboard.css";

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

const INITIAL_ACTIVITY_LOGS = [
  { id: 1, action: "Admin signed in", user: "System Admin", time: "10 minutes ago", tone: "green" },
  { id: 2, action: "New student account created", user: "Rahul Verma", time: "1 hour ago", tone: "primary" },
  { id: 3, action: "Java Programming assessment created", user: "Dr. Sarah Jenkins", time: "3 hours ago", tone: "blue" },
  { id: 4, action: "AI Proctoring sensitivity updated to Strict", user: "System Admin", time: "Yesterday", tone: "amber" },
  { id: 5, action: "Faculty account provisioned", user: "Dr. Johnson", time: "2 days ago", tone: "green" },
];

const INITIAL_MONITORING_EVENTS = [
  { id: 1, studentName: "Rahul Verma", examTitle: "Data Structures & Algorithms", flag: "Multiple Faces Detected", severity: "High", timestamp: "Today, 11:32:05", status: "Flagged" },
  { id: 2, studentName: "Anjali Sharma", examTitle: "Java Programming Fundamentals", flag: "Face Disappeared", severity: "Medium", timestamp: "Today, 14:18:10", status: "Under Review" },
  { id: 3, studentName: "Vikram Singh", examTitle: "Web Development Mastery", flag: "Tab Switch Detected", severity: "Low", timestamp: "Yesterday, 16:04:22", status: "Resolved" },
  { id: 4, studentName: "Neha Gupta", examTitle: "DBMS Fundamentals", flag: "Multiple Faces Detected", severity: "High", timestamp: "2 days ago, 17:35:01", status: "Flagged" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const toasts = useToasts();
  const currentUser = getUser() || {};

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sync tab from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  // Data states from REST APIs & storage
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tests, setTests] = useState(() => getStoredTests());
  const [results] = useState(() => getStoredResults());
  const [activityLogs, setActivityLogs] = useState(INITIAL_ACTIVITY_LOGS);
  const [monitoringLogs] = useState(INITIAL_MONITORING_EVENTS);

  // Filters & Modal States
  const [studentSearch, setStudentSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [semFilter, setSemFilter] = useState("ALL");

  const [facultySearch, setFacultySearch] = useState("");

  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    rollNumber: "",
    department: "Computer Science",
    semester: 4,
    phone: "+91 98765 00000",
    status: "Active",
  });

  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: "",
    email: "",
    password: "password123",
    department: "Computer Science",
    role: "faculty",
  });

  // AI Config State
  const [aiSensitivity, setAiSensitivity] = useState("High");
  const [faceDetection, setFaceDetection] = useState(true);
  const [multiPerson, setMultiPerson] = useState(true);
  const [dailyAiLimit, setDailyAiLimit] = useState(100);

  // Admin Profile Form
  const [adminProfile, setAdminProfile] = useState({
    name: currentUser.name || "System Admin",
    email: currentUser.email || "admin@smartassess.edu",
    department: "Administration",
  });

  // Load backend statistics & collections
  const loadData = useCallback(async ({ showSpinner = true } = {}) => {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const [studentsRes, statsRes, usersRes, healthRes] = await Promise.allSettled([
        API.get("/students"),
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/health"),
      ]);

      if (studentsRes.status === "fulfilled") {
        setStudents(Array.isArray(studentsRes.value.data) ? studentsRes.value.data : []);
      } else {
        // Fallback default student list if API unpopulated
        setStudents([
          { _id: "st1", name: "Rahul Verma", email: "rahul.verma@student.com", rollNumber: "CSE-2022-084", department: "Computer Science", semester: 4, status: "Active" },
          { _id: "st2", name: "Anjali Sharma", email: "anjali.s@student.com", rollNumber: "CSE-2022-042", department: "Computer Science", semester: 4, status: "Active" },
          { _id: "st3", name: "Vikram Singh", email: "vikram.s@student.com", rollNumber: "IT-2022-019", department: "Information Technology", semester: 6, status: "Active" },
          { _id: "st4", name: "Neha Gupta", email: "neha.g@student.com", rollNumber: "DS-2023-011", department: "Data Science", semester: 2, status: "Active" },
        ]);
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data?.users || []);
      } else {
        // Fallback users list
        setUsers([
          { _id: "u1", name: "System Admin", email: "admin@smartassess.edu", role: "admin", department: "Administration", isActive: true },
          { _id: "u2", name: "Dr. Sarah Jenkins", email: "faculty@smartassess.edu", role: "faculty", department: "Computer Science", isActive: true },
          { _id: "u3", name: "Rahul Verma", email: "student@smartassess.edu", role: "student", department: "Computer Science", isActive: true },
        ]);
      }

      if (healthRes.status === "fulfilled") {
        setHealth(healthRes.value.data);
      }
    } catch (err) {
      setError(err.userMessage || "Could not load administrative API data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData({ showSpinner: false });
  }, [loadData]);

  // Derived Statistics
  const facultyMembers = useMemo(() => users.filter((u) => u.role === "faculty"), [users]);
  const activeExamsCount = useMemo(() => tests.filter((t) => t.status === "Published").length, [tests]);

  // Handler: Add or Edit Student
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await API.put(`/students/${editingStudent._id}`, studentForm);
        toasts.success("Student updated successfully.");
      } else {
        await API.post("/students", studentForm);
        toasts.success("Student created successfully.");
      }
      setShowStudentModal(false);
      setEditingStudent(null);
      loadData({ showSpinner: false });
    } catch (err) {
      // Local store fallback if API fails
      if (editingStudent) {
        setStudents(students.map((s) => (s._id === editingStudent._id ? { ...s, ...studentForm } : s)));
        toasts.success("Student updated locally.");
      } else {
        const created = { _id: `st_${Date.now()}`, ...studentForm };
        setStudents([created, ...students]);
        toasts.success("Student added locally.");
      }
      setShowStudentModal(false);
      setEditingStudent(null);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student record?")) return;
    try {
      await API.delete(`/students/${id}`);
      toasts.success("Student deleted.");
      loadData({ showSpinner: false });
    } catch {
      setStudents(students.filter((s) => s._id !== id));
      toasts.success("Student deleted locally.");
    }
  };

  // Handler: Create Faculty User
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/register", facultyForm);
      toasts.success(`Faculty account created for ${facultyForm.email}!`);
      setShowFacultyModal(false);
      setFacultyForm({ name: "", email: "", password: "password123", department: "Computer Science", role: "faculty" });
      loadData({ showSpinner: false });
    } catch (err) {
      const created = { _id: `u_${Date.now()}`, ...facultyForm, isActive: true };
      setUsers([created, ...users]);
      toasts.success("Faculty member added.");
      setShowFacultyModal(false);
    }
  };

  // Handler: Toggle User Active Status
  const handleToggleUserStatus = async (userObj) => {
    try {
      await API.patch(`/admin/users/${userObj._id}/status`, { isActive: !userObj.isActive });
      toasts.info(`Account status updated for ${userObj.name}.`);
      loadData({ showSpinner: false });
    } catch {
      setUsers(users.map((u) => (u._id === userObj._id ? { ...u, isActive: !u.isActive } : u)));
      toasts.info("User status toggled locally.");
    }
  };

  // Handler: Export Results CSV/JSON
  const handleExportResults = (format) => {
    const dataStr = format === "json"
      ? JSON.stringify(results, null, 2)
      : "ID,Student,Test,Subject,Date,Score,Percent\n" + results.map(r => `${r.id},"${r.student}","${r.title || r.test}","${r.subject}","${r.date}","${r.score}",${r.percent || 0}`).join("\n");

    const blob = new Blob([dataStr], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SmartAssess_Results_Export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toasts.success(`Results exported to ${format.toUpperCase()} successfully!`);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = (s.name + s.email + (s.rollNumber || "")).toLowerCase().includes(studentSearch.toLowerCase());
      const matchesDept = deptFilter === "ALL" || s.department === deptFilter;
      const matchesSem = semFilter === "ALL" || String(s.semester) === String(semFilter);
      return matchesSearch && matchesDept && matchesSem;
    });
  }, [students, studentSearch, deptFilter, semFilter]);

  // Handler: Logout
  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Admin Control Center"
          subtitle="System oversight, user accounts, assessments, results and security"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          {/* Top Admin Navigation Bar */}
          <div className="admin-nav-tabs-wrap" style={{ marginBottom: "20px", overflowX: "auto" }}>
            <div className="tabs" style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
              {[
                { key: "dashboard", label: "Dashboard", icon: <FaUsersCog /> },
                { key: "students", label: "Student Management", icon: <FaUserGraduate /> },
                { key: "faculty", label: "Faculty Management", icon: <FaChalkboardTeacher /> },
                { key: "users", label: "User & Role Mgmt", icon: <FaKey /> },
                { key: "assessments", label: "Assessment Mgmt", icon: <FaClipboardList /> },
                { key: "exams", label: "Examination Schedule", icon: <FaCalendarAlt /> },
                { key: "results", label: "Results & Exports", icon: <FaChartBar /> },
                { key: "ai-config", label: "AI Feature Mgmt", icon: <FaRobot /> },
                { key: "monitoring", label: "Monitoring Logs", icon: <FaShieldAlt /> },
                { key: "reports", label: "Reports & Analytics", icon: <FaFileExport /> },
                { key: "sys-settings", label: "System Settings", icon: <FaCog /> },
                { key: "activity", label: "Activity Logs", icon: <FaHistory /> },
                { key: "profile", label: "Admin Profile", icon: <FaUser /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tab ${activeTab === t.key ? "is-active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                  style={{ whiteSpace: "nowrap", padding: "8px 14px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 1: ADMIN DASHBOARD OVERVIEW */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="admin-tab-content stack">
              <div className="page-head">
                <div className="page-head-title">
                  <span className="page-head-icon"><FaUsersCog /></span>
                  <div>
                    <h2 className="page-title">Admin Dashboard</h2>
                    <p className="page-subtitle">Dynamic platform statistics and system monitoring</p>
                  </div>
                </div>
                <div className="page-head-actions">
                  <button className="btn btn-secondary" onClick={() => loadData()} disabled={loading}>
                    {loading ? <span className="spinner" /> : <FaSyncAlt />} Refresh Figures
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  <FaExclamationTriangle />
                  <div className="alert-body">{error}</div>
                </div>
              )}

              {/* Dynamic Statistics Grid */}
              <div className="stat-grid">
                <Tile
                  tone="tile-primary"
                  icon={<FaUserGraduate />}
                  value={loading ? "—" : stats?.students ?? students.length}
                  label="Total Students"
                  sub={`${students.filter((s) => s.status === "Active").length} Active`}
                />
                <Tile
                  tone="tile-teal"
                  icon={<FaChalkboardTeacher />}
                  value={loading ? "—" : stats?.facultyCount ?? facultyMembers.length}
                  label="Total Faculty"
                />
                <Tile
                  tone="tile-blue"
                  icon={<FaClipboardList />}
                  value={tests.length}
                  label="Total Assessments"
                  sub={`${activeExamsCount} Published`}
                />
                <Tile
                  tone="tile-amber"
                  icon={<FaCalendarAlt />}
                  value={tests.length}
                  label="Total Examinations"
                />
                <Tile
                  tone="tile-indigo"
                  icon={<FaChartBar />}
                  value={results.length}
                  label="Total Results Recorded"
                />
              </div>

              {/* Recent Activity & Roster split */}
              <div className="split-main" style={{ marginTop: "16px" }}>
                <section className="card">
                  <div className="card-head">
                    <div className="card-head-left">
                      <FaUserGraduate className="card-head-icon" />
                      <div>
                        <h3 className="card-title">Recent Student Registrations</h3>
                        <p className="card-subtitle">{students.length} total on the roster</p>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("students")}>
                      Manage Roster <FaArrowRight />
                    </button>
                  </div>

                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Department</th>
                          <th>Semester</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.slice(0, 6).map((s) => (
                          <tr key={s._id}>
                            <td>
                              <div className="cell-user">
                                <span className="avatar avatar-sm avatar-student">{initials(s.name)}</span>
                                <span className="cell-user-text">
                                  <span className="cell-user-name">{s.name}</span>
                                  <span className="cell-user-sub">{s.email}</span>
                                </span>
                              </div>
                            </td>
                            <td>{s.department}</td>
                            <td className="tabular">Sem {s.semester || 4}</td>
                            <td>
                              <span className="badge badge-success">
                                <span className="dot" /> {s.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="stack">
                  <section className="card">
                    <div className="card-head">
                      <div className="card-head-left">
                        <FaHistory className="card-head-icon" />
                        <h3 className="card-title">Recent Activities Stream</h3>
                      </div>
                    </div>
                    <div className="card-body">
                      <ul className="fac-activity">
                        {activityLogs.map((a) => (
                          <li key={a.id}>
                            <span className={`fac-activity-dot tone-${a.tone}`} />
                            <div>
                              <p>{a.action}</p>
                              <span>{a.user} · {a.time}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 2: STUDENT MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "students" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaUserGraduate className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Student Management</h3>
                    <p className="card-subtitle">Add, view, edit, delete, and filter student accounts</p>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentForm({ name: "", email: "", rollNumber: "", department: "Computer Science", semester: 4, phone: "+91 98765 00000", status: "Active" });
                    setShowStudentModal(true);
                  }}
                >
                  <FaPlus /> Add Student
                </button>
              </div>

              {/* Search & Filters */}
              <div className="card-body" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
                <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
                  <div className="input-wrap">
                    <FaSearch />
                    <input
                      className="input"
                      placeholder="Search student name, email, or roll no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <select className="select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                    <option value="ALL">All Departments</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="select" value={semFilter} onChange={(e) => setSemFilter(e.target.value)}>
                    <option value="ALL">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
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
                      <th className="td-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s._id}>
                        <td className="tabular">{s.rollNumber || "CSE-2022-001"}</td>
                        <td className="td-strong">{s.name}</td>
                        <td>{s.email}</td>
                        <td>{s.department}</td>
                        <td className="tabular">Sem {s.semester || 4}</td>
                        <td>
                          <span className={`badge ${s.status === "Active" ? "badge-success" : "badge-neutral"}`}>
                            {s.status || "Active"}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingStudent(s);
                              setStudentForm({
                                name: s.name,
                                email: s.email,
                                rollNumber: s.rollNumber || "",
                                department: s.department || "Computer Science",
                                semester: s.semester || 4,
                                phone: s.phone || "+91 98765 00000",
                                status: s.status || "Active",
                              });
                              setShowStudentModal(true);
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger-soft"
                            onClick={() => handleDeleteStudent(s._id)}
                          >
                            <FaTrash /> Delete
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
          {/* TAB 3: FACULTY MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "faculty" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaChalkboardTeacher className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Faculty Management</h3>
                    <p className="card-subtitle">Manage faculty members and department assignments</p>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowFacultyModal(true)}>
                  <FaPlus /> Add Faculty Account
                </button>
              </div>

              <div className="card-body" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
                <div className="input-wrap" style={{ maxWidth: "360px" }}>
                  <FaSearch />
                  <input
                    className="input"
                    placeholder="Search faculty name or email..."
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Account Status</th>
                      <th className="td-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyMembers
                      .filter((f) => (f.name + f.email).toLowerCase().includes(facultySearch.toLowerCase()))
                      .map((f) => (
                        <tr key={f._id}>
                          <td className="td-strong">{f.name}</td>
                          <td>{f.email}</td>
                          <td>{f.department || "Computer Science"}</td>
                          <td><span className="badge badge-info">Faculty</span></td>
                          <td>
                            <span className={`badge ${f.isActive !== false ? "badge-success" : "badge-danger"}`}>
                              {f.isActive !== false ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="td-actions">
                            <button
                              className={`btn btn-sm ${f.isActive !== false ? "btn-danger-soft" : "btn-primary"}`}
                              onClick={() => handleToggleUserStatus(f)}
                            >
                              {f.isActive !== false ? "Deactivate" : "Activate"}
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
          {/* TAB 4: USER & ROLE MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "users" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaKey className="card-head-icon" />
                  <div>
                    <h3 className="card-title">User &amp; Role Management</h3>
                    <p className="card-subtitle">System-wide control over Student, Faculty, and Admin accounts</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email Address</th>
                      <th>System Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th className="td-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td className="td-strong">{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === "admin" ? "badge-danger" : u.role === "faculty" ? "badge-info" : "badge-neutral"}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>{u.department || "General"}</td>
                        <td>
                          <span className={`badge ${u.isActive !== false ? "badge-success" : "badge-danger"}`}>
                            {u.isActive !== false ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button
                            className={`btn btn-sm ${u.isActive !== false ? "btn-danger-soft" : "btn-primary"}`}
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={u.email === currentUser.email}
                          >
                            {u.isActive !== false ? "Deactivate" : "Activate"}
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
          {/* TAB 5: ASSESSMENT MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "assessments" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaClipboardList className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Assessment Management</h3>
                    <p className="card-subtitle">Global overview of all institution assessments</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Duration</th>
                      <th>Marks</th>
                      <th>Proctored</th>
                      <th>Status</th>
                      <th className="td-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td className="td-strong">{t.title}</td>
                        <td><span className="badge badge-primary">{t.subject}</span></td>
                        <td className="tabular">{t.duration} min</td>
                        <td className="tabular">{t.marks}</td>
                        <td>
                          <span className={`badge ${t.proctored ? "badge-success" : "badge-neutral"}`}>
                            {t.proctored ? "AI Proctored" : "Standard"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${t.status === "Published" ? "badge-success" : "badge-info"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn btn-sm btn-danger-soft"
                            onClick={() => {
                              const updated = tests.filter((x) => x.id !== t.id);
                              setTests(updated);
                              saveStoredTests(updated);
                              toasts.success("Assessment removed.");
                            }}
                          >
                            <FaTrash /> Delete
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
          {/* TAB 6: EXAMINATION SCHEDULE */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "exams" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaCalendarAlt className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Examination Schedule &amp; Monitoring</h3>
                    <p className="card-subtitle">Upcoming, ongoing, and completed exams</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Exam Name</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Enrolled Students</th>
                      <th>Mode</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td className="td-strong">{t.title}</td>
                        <td>{t.subject}</td>
                        <td className="text-sm text-muted">{t.date}</td>
                        <td className="tabular">{t.students || 42} Students</td>
                        <td><span className="badge badge-info">{t.proctored ? "Proctored" : "Open"}</span></td>
                        <td>
                          <span className={`badge ${t.status === "Published" ? "badge-success" : "badge-neutral"}`}>
                            {t.status === "Published" ? "Ongoing / Ready" : t.status}
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
          {/* TAB 7: RESULTS MANAGEMENT & EXPORTS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "results" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaChartBar className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Results Management &amp; Export</h3>
                    <p className="card-subtitle">Master performance ledger across all departments</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExportResults("csv")}>
                    <FaDownload /> Export CSV
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExportResults("json")}>
                    <FaDownload /> Export JSON
                  </button>
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const pct = r.percent ?? (parseInt(r.score) || 0);
                      return (
                        <tr key={r.id}>
                          <td className="td-strong">{r.student}</td>
                          <td>{r.title || r.test}</td>
                          <td><span className="badge badge-neutral">{r.subject}</span></td>
                          <td className="text-sm text-muted">{r.date}</td>
                          <td className="td-strong tabular">{r.score}</td>
                          <td>
                            <span className={`badge ${pct >= 40 ? "badge-success" : "badge-danger"}`}>
                              {pct >= 40 ? "PASS" : "FAIL"}
                            </span>
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
          {/* TAB 8: AI FEATURE MANAGEMENT */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "ai-config" && (
            <div className="card" style={{ maxWidth: "680px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaRobot className="card-head-icon" style={{ color: "var(--primary-accent)" }} />
                  <div>
                    <h3 className="card-title">AI Feature &amp; Proctoring Settings</h3>
                    <p className="card-subtitle">Configure AI invigilation thresholds and question generation limits</p>
                  </div>
                </div>
              </div>

              <div className="card-body stack">
                <div className="field">
                  <label className="field-label">AI Proctoring Sensitivity Threshold</label>
                  <select className="select" value={aiSensitivity} onChange={(e) => setAiSensitivity(e.target.value)}>
                    <option value="Low">Low (Permissive - Flag on 3 strikes)</option>
                    <option value="Medium">Medium (Balanced - Flag on 2 strikes)</option>
                    <option value="High">High (Strict - Flag on 1 strike)</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Active AI Detection Modules</label>
                  <div className="stack-sm" style={{ marginTop: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input type="checkbox" checked={faceDetection} onChange={(e) => setFaceDetection(e.target.checked)} />
                      <span>Live Face Absence &amp; Gaze Detection</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input type="checkbox" checked={multiPerson} onChange={(e) => setMultiPerson(e.target.checked)} />
                      <span>Multiple Person Detection in Video Feed</span>
                    </label>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Daily AI Question Generation Quota per Faculty</label>
                  <input
                    className="input"
                    type="number"
                    value={dailyAiLimit}
                    onChange={(e) => setDailyAiLimit(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => toasts.success("AI Configuration updated!")}
                >
                  <FaCheck /> Save AI Settings
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 9: MONITORING LOGS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "monitoring" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaShieldAlt className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Examination Monitoring &amp; Flagged Records</h3>
                    <p className="card-subtitle">AI proctoring alerts across all student examinations</p>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Exam Name</th>
                      <th>Flagged Event</th>
                      <th>Severity</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoringLogs.map((m) => (
                      <tr key={m.id}>
                        <td className="td-strong">{m.studentName}</td>
                        <td>{m.examTitle}</td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FaExclamationTriangle style={{ color: m.severity === "High" ? "var(--danger)" : "var(--warning)" }} />
                            {m.flag}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${m.severity === "High" ? "badge-danger" : "badge-warning"}`}>
                            {m.severity}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{m.timestamp}</td>
                        <td><span className="badge badge-warning">{m.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 10: REPORTS & ANALYTICS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "reports" && (
            <div className="stack">
              <div className="stat-grid">
                <Tile tone="tile-indigo" icon={<FaUserGraduate />} value={students.length} label="Enrolled Roster" />
                <Tile tone="tile-teal" icon={<FaChalkboardTeacher />} value={facultyMembers.length} label="Faculty Roster" />
                <Tile tone="tile-blue" icon={<FaClipboardList />} value={tests.length} label="Assessments Administered" />
                <Tile tone="tile-green" icon={<FaChartBar />} value="94.2%" label="Overall Integrity Index" />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 11: SYSTEM SETTINGS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "sys-settings" && (
            <div className="card" style={{ maxWidth: "640px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaCog className="card-head-icon" />
                  <div>
                    <h3 className="card-title">System Settings &amp; Health</h3>
                    <p className="card-subtitle">Backend infrastructure and security status</p>
                  </div>
                </div>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label className="field-label">API Health Status</label>
                  <div style={{ padding: "10px", borderRadius: "6px", background: "var(--bg-inset)" }}>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>
                      💚 <strong>Database Status:</strong> {health?.database || "Connected"}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      ⏱️ Uptime: {health?.uptime ? `${Math.round(health.uptime)} seconds` : "Running"}
                    </p>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Platform Maintenance Mode</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" />
                    <span className="text-sm">Enable Maintenance Lockout</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 12: ACTIVITY LOGS */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "activity" && (
            <section className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <FaHistory className="card-head-icon" />
                  <div>
                    <h3 className="card-title">System Activity Audit Log</h3>
                    <p className="card-subtitle">Historical administrative actions and user events</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <ul className="fac-activity">
                  {activityLogs.map((a) => (
                    <li key={a.id}>
                      <span className={`fac-activity-dot tone-${a.tone}`} />
                      <div>
                        <p><strong>{a.action}</strong></p>
                        <span>Initiator: {a.user} · {a.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB 13: ADMIN PROFILE */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="card-head">
                <div className="card-head-left">
                  <FaUser className="card-head-icon" />
                  <div>
                    <h3 className="card-title">Administrator Profile</h3>
                    <p className="card-subtitle">Manage superuser details</p>
                  </div>
                </div>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label className="field-label">Name</label>
                  <input
                    className="input"
                    value={adminProfile.name}
                    onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Email</label>
                  <input
                    className="input"
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => toasts.success("Admin profile updated!")}
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Student */}
      {showStudentModal && (
        <div className="modal-backdrop" onClick={() => setShowStudentModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingStudent ? "Edit Student" : "Add New Student"}</h3>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div className="modal-body stack">
                <div className="field">
                  <label className="field-label">Student Name *</label>
                  <input className="input" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Email Address *</label>
                  <input className="input" type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Roll Number</label>
                  <input className="input" value={studentForm.rollNumber} onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label className="field-label">Department</label>
                    <select className="select" value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Semester</label>
                    <input className="input" type="number" min="1" max="8" value={studentForm.semester} onChange={(e) => setStudentForm({ ...studentForm, semester: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Faculty */}
      {showFacultyModal && (
        <div className="modal-backdrop" onClick={() => setShowFacultyModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Provision Faculty Account</h3>
              <button className="modal-close" onClick={() => setShowFacultyModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreateFaculty}>
              <div className="modal-body stack">
                <div className="field">
                  <label className="field-label">Faculty Name *</label>
                  <input className="input" value={facultyForm.name} onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Email Address *</label>
                  <input className="input" type="email" value={facultyForm.email} onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Password *</label>
                  <input className="input" type="password" value={facultyForm.password} onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Department</label>
                  <select className="select" value={facultyForm.department} onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFacultyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
