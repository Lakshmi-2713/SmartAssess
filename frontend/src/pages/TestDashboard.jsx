import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaEdit,
  FaEye,
  FaTrashAlt,
  FaTimes,
  FaSearch,
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaUsers,
  FaChartBar,
  FaCopy,
  FaToggleOn,
  FaToggleOff,
  FaPlay,
  FaAward,
  FaCalendarAlt,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import { getUser } from "../services/session";
import { getStoredTests, saveStoredTests, nextId } from "../services/storage";
import "../styles/testDashboard.css";

const STATUS_META = {
  Published: { badge: "badge-success", icon: <FaCheckCircle /> },
  Upcoming: { badge: "badge-info", icon: <FaClock /> },
  Draft: { badge: "badge-neutral", icon: <FaFileAlt /> },
};

const TABS = ["All", "Published", "Upcoming", "Draft"];
const SUBJECTS = ["Java", "DSA", "Web Dev", "DBMS", "OS", "CN", "Python", "AI/ML", "Cloud"];

const EMPTY_FORM = {
  title: "",
  subject: "Java",
  duration: "60",
  marks: "100",
  date: "",
  status: "Upcoming",
  proctored: true,
  description: "",
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  const d = Number(form.duration);
  if (!Number.isFinite(d) || d < 1 || d > 600) errors.duration = "Duration must be 1–600 minutes.";
  const m = Number(form.marks);
  if (!Number.isFinite(m) || m < 1 || m > 1000) errors.marks = "Total marks must be 1–1000.";
  return errors;
}

export default function TestDashboard() {
  const navigate = useNavigate();
  const toasts = useToasts();
  const user = getUser() || {};
  const isStaff = user.role === "faculty" || user.role === "admin";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [tests, setTests] = useState(() => getStoredTests());
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  const [modal, setModal] = useState(null); // "create" | "edit" | "view" | "delete"
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const persist = (next) => {
    setTests(next);
    if (!saveStoredTests(next)) {
      toasts.error("Changes could not be saved — local storage is full.");
    }
  };

  const counts = useMemo(
    () => ({
      All: tests.length,
      Published: tests.filter((t) => t.status === "Published").length,
      Upcoming: tests.filter((t) => t.status === "Upcoming").length,
      Draft: tests.filter((t) => t.status === "Draft").length,
    }),
    [tests]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      const matchTab = tab === "All" || t.status === tab;
      const matchQuery =
        !q ||
        String(t.title || "").toLowerCase().includes(q) ||
        String(t.subject || "").toLowerCase().includes(q);
      return matchTab && matchQuery;
    });
  }, [tests, tab, query]);

  const totals = useMemo(() => {
    const students = tests.reduce((a, t) => a + (Number(t.students) || 0), 0);
    const attempts = tests.reduce((a, t) => a + (Number(t.attempts) || 0), 0);
    return {
      students,
      attempts,
      completion: students > 0 ? Math.round((attempts / students) * 100) : 0,
    };
  }, [tests]);

  const setField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const closeModal = () => {
    setModal(null);
    setCurrent(null);
    setErrors({});
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal("create");
  };

  const openEdit = (t) => {
    setCurrent(t);
    setForm({
      title: t.title || "",
      subject: t.subject || "Java",
      duration: String(t.duration ?? 60),
      marks: String(t.marks ?? 100),
      date: t.date || "",
      status: t.status || "Upcoming",
      proctored: Boolean(t.proctored),
      description: t.description || "",
    });
    setErrors({});
    setModal("edit");
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length) return setErrors(found);

    const entry = {
      // nextId() is monotonic — Date.now() collided when two tests were
      // created inside the same millisecond.
      id: nextId(),
      title: form.title.trim(),
      subject: form.subject,
      date: form.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      duration: Number(form.duration),
      marks: Number(form.marks),
      status: form.status,
      students: 0,
      attempts: 0,
      proctored: form.proctored,
      description: form.description.trim(),
    };

    persist([entry, ...tests]);
    toasts.success(`“${entry.title}” created.`);
    closeModal();
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!current) return;
    const found = validate(form);
    if (Object.keys(found).length) return setErrors(found);

    persist(
      tests.map((t) =>
        t.id === current.id
          ? {
              ...t,
              title: form.title.trim(),
              subject: form.subject,
              date: form.date || t.date,
              duration: Number(form.duration),
              marks: Number(form.marks),
              status: form.status,
              proctored: form.proctored,
              description: form.description.trim(),
            }
          : t
      )
    );
    toasts.success("Assessment updated.");
    closeModal();
  };

  const handleDelete = () => {
    if (!current) return;
    persist(tests.filter((t) => t.id !== current.id));
    toasts.success(`“${current.title}” deleted.`);
    closeModal();
  };

  const handleDuplicate = (t) => {
    const copy = {
      ...t,
      id: nextId(),
      title: `${t.title} (copy)`,
      status: "Draft",
      attempts: 0,
      students: 0,
    };
    persist([copy, ...tests]);
    toasts.info(`Duplicated as a draft.`);
  };

  const handleToggleStatus = (id) => {
    persist(
      tests.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "Published" ? "Upcoming" : "Published" }
          : t
      )
    );
  };

  const startTest = (t) => navigate(`/take-test?testId=${t.id}`);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Test Management"
          subtitle="Create, schedule and publish assessments"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          <div className="page-head">
            <div className="page-head-title">
              <span className="page-head-icon"><FaClipboardList /></span>
              <div>
                <h2 className="page-title">Assessments</h2>
                <p className="page-subtitle">{tests.length} tests in the catalogue</p>
              </div>
            </div>
            {isStaff && (
              <div className="page-head-actions">
                <button className="btn btn-primary" onClick={openCreate}>
                  <FaPlus /> Create test
                </button>
              </div>
            )}
          </div>

          <div className="stat-grid">
            <Tile tone="tile-primary" icon={<FaClipboardList />} value={counts.All} label="Total tests" />
            <Tile tone="tile-green" icon={<FaCheckCircle />} value={counts.Published} label="Published" />
            <Tile tone="tile-blue" icon={<FaClock />} value={counts.Upcoming} label="Upcoming" />
            <Tile tone="tile-indigo" icon={<FaUsers />} value={totals.students} label="Enrolments" />
            <Tile tone="tile-amber" icon={<FaChartBar />} value={`${totals.completion}%`} label="Completion" />
          </div>

          <div className="toolbar">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`tab ${tab === t ? "is-active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t} <span className="tab-count">{counts[t]}</span>
                </button>
              ))}
            </div>

            <div className="toolbar-search">
              <div className="input-wrap">
                <FaSearch />
                <input
                  className="input"
                  type="search"
                  placeholder="Search tests…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search tests"
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon"><FaClipboardList /></span>
                <p className="empty-title">No assessments found</p>
                <p className="empty-text">
                  {tests.length === 0
                    ? "Create your first assessment to get started."
                    : "Try a different search term or tab."}
                </p>
                {isStaff && tests.length === 0 && (
                  <button className="btn btn-primary" onClick={openCreate}>
                    <FaPlus /> Create test
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="test-grid">
              {filtered.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.Draft;
                const completion =
                  t.students > 0 ? Math.round((t.attempts / t.students) * 100) : 0;

                return (
                  <article key={t.id} className="test-card card-interactive">
                    <header className="test-card-head">
                      <span className={`badge ${meta.badge}`}>
                        {meta.icon} {t.status}
                      </span>
                      {t.proctored && (
                        <span className="badge badge-primary">
                          <FaShieldAlt /> Proctored
                        </span>
                      )}
                    </header>

                    <h3 className="test-card-title">{t.title}</h3>
                    {t.description && <p className="test-card-desc">{t.description}</p>}

                    <dl className="test-card-meta">
                      <div><dt>Subject</dt><dd>{t.subject}</dd></div>
                      <div><dt>Duration</dt><dd>{t.duration} min</dd></div>
                      <div><dt>Marks</dt><dd>{t.marks}</dd></div>
                      <div><dt>Date</dt><dd>{t.date}</dd></div>
                    </dl>

                    <div className="test-card-progress">
                      <div className="row-between text-xs">
                        <span className="text-muted">
                          {t.attempts} of {t.students} attempted
                        </span>
                        <span className="tabular">{completion}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${completion}%` }} />
                      </div>
                    </div>

                    <footer className="test-card-foot">
                      <button
                        className="btn btn-primary btn-sm grow"
                        onClick={() => startTest(t)}
                        disabled={t.status === "Draft"}
                        title={t.status === "Draft" ? "Publish this test first" : "Launch"}
                      >
                        <FaPlay /> Launch
                      </button>

                      <button
                        className="btn btn-icon"
                        onClick={() => { setCurrent(t); setModal("view"); }}
                        title="Details"
                        aria-label={`Details for ${t.title}`}
                      >
                        <FaEye />
                      </button>

                      {isStaff && (
                        <>
                          <button
                            className="btn btn-icon"
                            onClick={() => handleToggleStatus(t.id)}
                            title={t.status === "Published" ? "Unpublish" : "Publish"}
                            aria-label={t.status === "Published" ? "Unpublish" : "Publish"}
                          >
                            {t.status === "Published" ? <FaToggleOn /> : <FaToggleOff />}
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={() => handleDuplicate(t)}
                            title="Duplicate"
                            aria-label={`Duplicate ${t.title}`}
                          >
                            <FaCopy />
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={() => openEdit(t)}
                            title="Edit"
                            aria-label={`Edit ${t.title}`}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-icon btn-icon-danger"
                            onClick={() => { setCurrent(t); setModal("delete"); }}
                            title="Delete"
                            aria-label={`Delete ${t.title}`}
                          >
                            <FaTrashAlt />
                          </button>
                        </>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / edit */}
      {(modal === "create" || modal === "edit") && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <form onSubmit={modal === "create" ? handleCreate : handleEditSave} noValidate>
              <div className="modal-head">
                <div className="modal-head-left">
                  <span className="modal-head-icon">{modal === "create" ? <FaPlus /> : <FaEdit />}</span>
                  <div>
                    <h3 className="modal-title">
                      {modal === "create" ? "Create assessment" : "Edit assessment"}
                    </h3>
                    <p className="modal-sub">
                      {modal === "create" ? "Set up a new test paper." : current?.title}
                    </p>
                  </div>
                </div>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid">
                  <div className="field form-row-full">
                    <label className="field-label">Title <span className="req">*</span></label>
                    <input
                      className={`input ${errors.title ? "has-error" : ""}`}
                      name="title"
                      value={form.title}
                      onChange={setField}
                      placeholder="e.g. Java Programming Fundamentals"
                    />
                    {errors.title && <span className="field-error">{errors.title}</span>}
                  </div>

                  <div className="field">
                    <label className="field-label">Subject</label>
                    <select className="select" name="subject" value={form.subject} onChange={setField}>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Status</label>
                    <select className="select" name="status" value={form.status} onChange={setField}>
                      <option value="Draft">Draft</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Duration (minutes) <span className="req">*</span></label>
                    <input
                      className={`input ${errors.duration ? "has-error" : ""}`}
                      name="duration"
                      type="number"
                      min="1"
                      max="600"
                      value={form.duration}
                      onChange={setField}
                    />
                    {errors.duration && <span className="field-error">{errors.duration}</span>}
                  </div>

                  <div className="field">
                    <label className="field-label">Total marks <span className="req">*</span></label>
                    <input
                      className={`input ${errors.marks ? "has-error" : ""}`}
                      name="marks"
                      type="number"
                      min="1"
                      max="1000"
                      value={form.marks}
                      onChange={setField}
                    />
                    {errors.marks && <span className="field-error">{errors.marks}</span>}
                  </div>

                  <div className="field form-row-full">
                    <label className="field-label">Scheduled date</label>
                    <input
                      className="input"
                      name="date"
                      value={form.date}
                      onChange={setField}
                      placeholder="e.g. 30 May 2025"
                    />
                  </div>

                  <div className="field form-row-full">
                    <label className="field-label">Description</label>
                    <textarea
                      className="textarea"
                      name="description"
                      value={form.description}
                      onChange={setField}
                      rows="3"
                      placeholder="What does this assessment cover?"
                    />
                  </div>

                  <div className="field form-row-full">
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="proctored"
                        checked={form.proctored}
                        onChange={setField}
                      />
                      <span className="switch-track" />
                      <span>
                        <strong className="text-sm">AI proctoring</strong>
                        <span className="field-hint" style={{ display: "block" }}>
                          Requires camera access and fullscreen lockdown.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {modal === "create" ? "Create test" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View */}
      {modal === "view" && current && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="modal-head-icon"><FaClipboardList /></span>
                <div>
                  <h3 className="modal-title">{current.title}</h3>
                  <p className="modal-sub">{current.subject}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Close"><FaTimes /></button>
            </div>
            <div className="modal-body">
              {current.description && <p className="text-muted" style={{ marginBottom: "var(--sp-4)" }}>{current.description}</p>}
              <dl className="detail-list">
                <Row icon={<FaCheckCircle />} label="Status" value={current.status} />
                <Row icon={<FaClock />} label="Duration" value={`${current.duration} minutes`} />
                <Row icon={<FaAward />} label="Total marks" value={current.marks} />
                <Row icon={<FaCalendarAlt />} label="Scheduled" value={current.date} />
                <Row icon={<FaUsers />} label="Enrolled" value={current.students} />
                <Row icon={<FaChartBar />} label="Attempts" value={current.attempts} />
                <Row icon={<FaShieldAlt />} label="Proctoring" value={current.proctored ? "Enabled" : "Disabled"} />
              </dl>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => startTest(current)}
                disabled={current.status === "Draft"}
              >
                <FaPlay /> Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {modal === "delete" && current && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="modal-head-icon is-danger"><FaExclamationTriangle /></span>
                <div>
                  <h3 className="modal-title">Delete assessment?</h3>
                  <p className="modal-sub">This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                <strong>{current.title}</strong> will be removed from the catalogue.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

function Row({ icon, label, value }) {
  return (
    <div className="detail-row">
      <dt><span className="detail-icon">{icon}</span>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
