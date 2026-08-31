import React, { useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
  FaPlus, FaEdit, FaEye, FaTrashAlt, FaTimes, FaSearch,
  FaFilter, FaClipboardList, FaCheckCircle, FaClock,
  FaFileAlt, FaUsers, FaChartBar, FaCalendarAlt,
  FaBolt, FaDownload, FaCopy, FaToggleOn, FaToggleOff,
  FaPlay,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getStoredTests, saveStoredTests } from "../services/storage";
import "../styles/testDashboard.css";

const STATUS_CONFIG = {
  Published: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)", icon: <FaCheckCircle /> },
  Upcoming:  { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.28)", icon: <FaClock /> },
  Draft:     { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.28)", icon: <FaFileAlt /> },
};

const TABS = [
  { label: "All Tests", icon: <FaClipboardList /> },
  { label: "Published", icon: <FaCheckCircle /> },
  { label: "Upcoming",  icon: <FaClock /> },
  { label: "Draft",     icon: <FaFileAlt /> },
];

const SUBJECTS = ["Java", "DSA", "Web Dev", "DBMS", "OS", "CN", "Python", "AI/ML", "Cloud"];

function TestDashboard() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tests, setTests] = useState(() => getStoredTests());
  const [activeTab, setActiveTab] = useState("All Tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView]     = useState(null);  // test object
  const [showEdit, setShowEdit]     = useState(null);  // test object

  // Create form state
  const [form, setForm] = useState({
    title: "", subject: "Java", duration: "60", marks: "100",
    date: "", status: "Upcoming", proctored: true, description: "",
  });

  // Edit form state mirrors form
  const [editForm, setEditForm] = useState({});

  const counts = useMemo(() => ({
    all: tests.length,
    published: tests.filter((t) => t.status === "Published").length,
    upcoming: tests.filter((t) => t.status === "Upcoming").length,
    draft: tests.filter((t) => t.status === "Draft").length,
  }), [tests]);

  const filtered = useMemo(() => {
    let list = tests;
    if (activeTab !== "All Tests") list = list.filter((t) => t.status === activeTab);
    if (searchQuery.trim())
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return list;
  }, [tests, activeTab, searchQuery]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title || !form.subject) return;
    const entry = {
      id: Date.now(),
      title: form.title,
      subject: form.subject,
      date: form.date || "30 May 2025",
      duration: parseInt(form.duration) || 60,
      marks: parseInt(form.marks) || 100,
      status: form.status,
      students: 0,
      attempts: 0,
      proctored: form.proctored,
      description: form.description,
    };
    const updated = [entry, ...tests];
    setTests(updated);
    saveStoredTests(updated);
    setShowCreate(false);
    setForm({ title: "", subject: "Java", duration: "60", marks: "100", date: "", status: "Upcoming", proctored: true, description: "" });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this assessment?")) {
      const updated = tests.filter((t) => t.id !== id);
      setTests(updated);
      saveStoredTests(updated);
    }
  };

  const handleDuplicate = (t) => {
    const copy = { ...t, id: Date.now(), title: `${t.title} (Copy)`, status: "Draft", attempts: 0 };
    const updated = [copy, ...tests];
    setTests(updated);
    saveStoredTests(updated);
  };

  const handleToggleStatus = (id) => {
    const updated = tests.map((t) => {
      if (t.id !== id) return t;
      const next = t.status === "Published" ? "Upcoming" : t.status === "Upcoming" ? "Published" : "Published";
      return { ...t, status: next };
    });
    setTests(updated);
    saveStoredTests(updated);
  };

  const handleEditOpen = (t) => {
    setEditForm({ ...t, duration: String(t.duration), marks: String(t.marks) });
    setShowEdit(t);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    const updated = tests.map((t) =>
      t.id === showEdit.id
        ? { ...t, ...editForm, duration: parseInt(editForm.duration) || 60, marks: parseInt(editForm.marks) || 100 }
        : t
    );
    setTests(updated);
    saveStoredTests(updated);
    setShowEdit(null);
  };

  const handleStartTest = (test) => {
    localStorage.setItem("smartassess_active_test", JSON.stringify(test));
    navigate(`/take-test?testId=${test.id}`);
  };

  /* ── Summary Stats ────────────────────────────────────── */
  const totalStudents = tests.reduce((a, t) => a + t.students, 0);
  const totalAttempts = tests.reduce((a, t) => a + t.attempts, 0);
  const avgCompletion = totalStudents > 0 ? Math.round((totalAttempts / totalStudents) * 100) : 0;

  return (
    <div className="test-mgmt-layout">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="test-mgmt-main">
        <Navbar
          title="Test Management"
          subtitle="Create, manage and schedule assessments"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="test-mgmt-body">
          {/* ── Page Header ─────────────────────────────── */}
          <div className="tm-page-header">
            <div className="tm-page-header-left">
              <div className="tm-header-icon-box">
                <FaClipboardList />
              </div>
              <div>
                <h2 className="tm-page-title">Test Management</h2>
                <p className="tm-page-sub">Create, manage and schedule assessments</p>
              </div>
            </div>
            <button className="tm-create-btn" onClick={() => setShowCreate(true)}>
              <FaPlus /> Create Test
            </button>
          </div>

          {/* ── Summary Cards ───────────────────────────── */}
          <div className="tm-summary-grid">
            <div className="tm-summary-card tsc-all">
              <div className="tsc-icon"><FaClipboardList /></div>
              <div className="tsc-content">
                <span className="tsc-value">{counts.all}</span>
                <span className="tsc-label">Total Tests</span>
              </div>
            </div>
            <div className="tm-summary-card tsc-published">
              <div className="tsc-icon"><FaCheckCircle /></div>
              <div className="tsc-content">
                <span className="tsc-value">{counts.published}</span>
                <span className="tsc-label">Published</span>
              </div>
            </div>
            <div className="tm-summary-card tsc-upcoming">
              <div className="tsc-icon"><FaClock /></div>
              <div className="tsc-content">
                <span className="tsc-value">{counts.upcoming}</span>
                <span className="tsc-label">Upcoming</span>
              </div>
            </div>
            <div className="tm-summary-card tsc-students">
              <div className="tsc-icon"><FaUsers /></div>
              <div className="tsc-content">
                <span className="tsc-value">{totalStudents}</span>
                <span className="tsc-label">Enrolled</span>
              </div>
            </div>
            <div className="tm-summary-card tsc-completion">
              <div className="tsc-icon"><FaChartBar /></div>
              <div className="tsc-content">
                <span className="tsc-value">{avgCompletion}%</span>
                <span className="tsc-label">Completion</span>
              </div>
            </div>
          </div>

          {/* ── Filters Bar ─────────────────────────────── */}
          <div className="tm-filters-bar">
            <div className="tm-tabs-row">
              {TABS.map(({ label, icon }) => (
                <button
                  key={label}
                  className={`tm-tab-btn ${activeTab === label ? "active" : ""}`}
                  onClick={() => setActiveTab(label)}
                >
                  {icon}
                  <span>{label}</span>
                  <span className="tm-tab-count">
                    {label === "All Tests" ? counts.all
                      : label === "Published" ? counts.published
                      : label === "Upcoming"  ? counts.upcoming
                      : counts.draft}
                  </span>
                </button>
              ))}
            </div>
            <div className="tm-search-box">
              <FaSearch className="tm-search-icon" />
              <input
                type="text"
                placeholder="Search tests…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="tm-search-clear" onClick={() => setSearchQuery("")}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* ── Test Cards Grid (mobile) / Table (desktop) ── */}
          {/* Desktop Table */}
          <div className="tm-table-wrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Marks</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="tm-empty-row">
                      <div className="tm-empty-state">
                        <FaFilter />
                        <p>No tests found for "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery("")}>Clear search</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.Draft;
                    return (
                      <tr key={t.id} className="tm-table-row">
                        <td>
                          <div className="tm-test-cell">
                            <div className="tm-test-dot" style={{ background: sc.color }} />
                            <div>
                              <p className="tm-test-title">{t.title}</p>
                              {t.proctored && (
                                <span className="tm-proctored-tag"><FaBolt />Proctored</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><span className="tm-subject-badge">{t.subject}</span></td>
                        <td>
                          <span className="tm-date-cell"><FaCalendarAlt />{t.date}</span>
                        </td>
                        <td><span className="tm-duration-cell"><FaClock />{t.duration} min</span></td>
                        <td><strong style={{ color: "#f1f5f9" }}>{t.marks}</strong></td>
                        <td>
                          <div className="tm-students-cell">
                            <FaUsers />
                            <span>{t.students}</span>
                            {t.attempts > 0 && (
                              <span className="tm-attempts-badge">{t.attempts} attempts</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className="tm-status-pill"
                            style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                          >
                            {sc.icon} {t.status}
                          </span>
                        </td>
                        <td>
                          <div className="tm-action-row">
                            <button className="tm-action-btn" title="Take Test (Assessment Mode)" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.3)" }} onClick={() => handleStartTest(t)}>
                              <FaPlay />
                            </button>
                            <button className="tm-action-btn" title="View" onClick={() => setShowView(t)}>
                              <FaEye />
                            </button>
                            <button className="tm-action-btn" title="Edit" onClick={() => handleEditOpen(t)}>
                              <FaEdit />
                            </button>
                            <button className="tm-action-btn" title="Duplicate" onClick={() => handleDuplicate(t)}>
                              <FaCopy />
                            </button>
                            <button
                              className="tm-action-btn"
                              title={t.status === "Published" ? "Unpublish" : "Publish"}
                              onClick={() => handleToggleStatus(t.id)}
                            >
                              {t.status === "Published" ? <FaToggleOn /> : <FaToggleOff />}
                            </button>
                            <button className="tm-action-btn tm-delete-btn" title="Delete" onClick={() => handleDelete(t.id)}>
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="tm-mobile-cards">
            {filtered.map((t) => {
              const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.Draft;
              return (
                <div key={t.id} className="tm-mobile-card">
                  <div className="tm-mc-top">
                    <div className="tm-mc-title-row">
                      <div className="tm-test-dot" style={{ background: sc.color }} />
                      <p className="tm-mc-title">{t.title}</p>
                    </div>
                    <span
                      className="tm-status-pill"
                      style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                    >
                      {sc.icon} {t.status}
                    </span>
                  </div>
                  <div className="tm-mc-meta">
                    <span><FaCalendarAlt />{t.date}</span>
                    <span><FaClock />{t.duration} min</span>
                    <span><FaClipboardList />{t.marks} marks</span>
                    <span><FaUsers />{t.students} students</span>
                  </div>
                  <div className="tm-mc-actions">
                    <button onClick={() => handleStartTest(t)} style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.4)" }}><FaPlay /> Take Test</button>
                    <button onClick={() => setShowView(t)}><FaEye /> View</button>
                    <button onClick={() => handleEditOpen(t)}><FaEdit /> Edit</button>
                    <button onClick={() => handleDuplicate(t)}><FaCopy /> Copy</button>
                    <button onClick={() => handleDelete(t.id)} className="tm-mc-delete"><FaTrashAlt /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── CREATE TEST MODAL ───────────────────────────── */}
      {showCreate && (
        <div className="tm-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <div className="tm-modal-title-row">
                <div className="tm-modal-icon-box"><FaPlus /></div>
                <div>
                  <h3>Create New Assessment</h3>
                  <p>Fill in the details to schedule a test</p>
                </div>
              </div>
              <button className="tm-modal-close" onClick={() => setShowCreate(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreate} className="tm-modal-form">
              <div className="tm-form-grid">
                <div className="tm-form-group tm-col-2">
                  <label>Test Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. AI & Machine Learning Midterm"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="tm-form-group">
                  <label>Subject *</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="tm-form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Upcoming</option>
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
                <div className="tm-form-group">
                  <label>Duration (Minutes)</label>
                  <input type="number" min="10" max="360" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div className="tm-form-group">
                  <label>Total Marks</label>
                  <input type="number" min="10" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
                </div>
                <div className="tm-form-group">
                  <label>Scheduled Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="tm-form-group tm-col-2">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Optional exam instructions or overview…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="tm-form-group tm-col-2">
                  <label className="tm-toggle-label">
                    <span>Enable AI Proctoring</span>
                    <button
                      type="button"
                      className={`tm-toggle-btn ${form.proctored ? "on" : "off"}`}
                      onClick={() => setForm({ ...form, proctored: !form.proctored })}
                    >
                      <span className="tm-toggle-thumb" />
                    </button>
                    <span className="tm-toggle-state">{form.proctored ? "Enabled" : "Disabled"}</span>
                  </label>
                </div>
              </div>
              <div className="tm-modal-footer">
                <button type="button" className="tm-btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="tm-btn-submit">
                  <FaCheckCircle /> Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────── */}
      {showEdit && (
        <div className="tm-modal-overlay" onClick={() => setShowEdit(null)}>
          <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <div className="tm-modal-title-row">
                <div className="tm-modal-icon-box" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}><FaEdit /></div>
                <div>
                  <h3>Edit Assessment</h3>
                  <p>{showEdit.title}</p>
                </div>
              </div>
              <button className="tm-modal-close" onClick={() => setShowEdit(null)}><FaTimes /></button>
            </div>
            <form onSubmit={handleEditSave} className="tm-modal-form">
              <div className="tm-form-grid">
                <div className="tm-form-group tm-col-2">
                  <label>Test Title</label>
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                </div>
                <div className="tm-form-group">
                  <label>Subject</label>
                  <select value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="tm-form-group">
                  <label>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option>Upcoming</option>
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
                <div className="tm-form-group">
                  <label>Duration (min)</label>
                  <input type="number" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
                </div>
                <div className="tm-form-group">
                  <label>Total Marks</label>
                  <input type="number" value={editForm.marks} onChange={(e) => setEditForm({ ...editForm, marks: e.target.value })} />
                </div>
              </div>
              <div className="tm-modal-footer">
                <button type="button" className="tm-btn-cancel" onClick={() => setShowEdit(null)}>Cancel</button>
                <button type="submit" className="tm-btn-submit"><FaCheckCircle /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ──────────────────────────────────── */}
      {showView && (() => {
        const sc = STATUS_CONFIG[showView.status] || STATUS_CONFIG.Draft;
        const completion = showView.students > 0 ? Math.round((showView.attempts / showView.students) * 100) : 0;
        return (
          <div className="tm-modal-overlay" onClick={() => setShowView(null)}>
            <div className="tm-modal-card tm-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tm-modal-header">
                <div className="tm-modal-title-row">
                  <div
                    className="tm-modal-icon-box"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                  >
                    <FaEye />
                  </div>
                  <div>
                    <h3>{showView.title}</h3>
                    <p>{showView.subject} · {showView.date}</p>
                  </div>
                </div>
                <button className="tm-modal-close" onClick={() => setShowView(null)}><FaTimes /></button>
              </div>
              <div className="tm-view-body">
                <div className="tm-view-stat-grid">
                  <div className="tm-view-stat">
                    <span className="tvs-label">Duration</span>
                    <span className="tvs-value">{showView.duration} min</span>
                  </div>
                  <div className="tm-view-stat">
                    <span className="tvs-label">Total Marks</span>
                    <span className="tvs-value">{showView.marks}</span>
                  </div>
                  <div className="tm-view-stat">
                    <span className="tvs-label">Enrolled</span>
                    <span className="tvs-value">{showView.students}</span>
                  </div>
                  <div className="tm-view-stat">
                    <span className="tvs-label">Attempts</span>
                    <span className="tvs-value">{showView.attempts}</span>
                  </div>
                  <div className="tm-view-stat">
                    <span className="tvs-label">Completion</span>
                    <span className="tvs-value" style={{ color: sc.color }}>{completion}%</span>
                  </div>
                  <div className="tm-view-stat">
                    <span className="tvs-label">Status</span>
                    <span className="tm-status-pill" style={{ color: sc.color, background: sc.bg }}>
                      {sc.icon} {showView.status}
                    </span>
                  </div>
                </div>
                {showView.description && (
                  <div className="tm-view-desc">
                    <p className="tvd-label">Description</p>
                    <p className="tvd-text">{showView.description}</p>
                  </div>
                )}
                {showView.proctored && (
                  <div className="tm-proctored-notice">
                    <FaBolt /> AI Proctoring is enabled for this test
                  </div>
                )}
                <div className="tm-view-progress">
                  <div className="tvp-header">
                    <span>Completion Progress</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="tvp-bar-bg">
                    <div className="tvp-bar-fill" style={{ width: `${completion}%`, background: sc.color }} />
                  </div>
                </div>
              </div>
              <div className="tm-modal-footer">
                <button className="tm-btn-cancel" onClick={() => setShowView(null)}>Close</button>
                <button className="tm-btn-submit" onClick={() => { setShowView(null); handleEditOpen(showView); }}>
                  <FaEdit /> Edit Test
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default TestDashboard;
