import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaEye,
  FaTimes,
  FaUserGraduate,
  FaUserCheck,
  FaUserTimes,
  FaBuilding,
  FaSyncAlt,
  FaPhone,
  FaEnvelope,
  FaBookOpen,
  FaExclamationTriangle,
  FaIdBadge,
} from "react-icons/fa";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import { getUser } from "../services/session";
import "../styles/students.css";

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

const EMPTY_FORM = {
  name: "",
  email: "",
  rollNumber: "",
  department: "Computer Science",
  semester: "1",
  phone: "",
  status: "Active",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side mirror of the server rules, for fast feedback only. */
function validate(form) {
  const errors = {};
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.department) errors.department = "Department is required.";
  const sem = Number(form.semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
    errors.semester = "Semester must be between 1 and 8.";
  }
  if (!form.phone.trim()) errors.phone = "Phone is required.";
  return errors;
}

export default function StudentManagement() {
  const toasts = useToasts();
  const currentUser = getUser() || {};
  const canDelete = currentUser.role === "admin";

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedSemester, setSelectedSemester] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [modal, setModal] = useState(null); // "add" | "edit" | "view" | "delete"
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * `showSpinner` is false for the initial load because `loading` already
   * starts true — setting it again synchronously inside the mount effect
   * causes a cascading re-render.
   */
  const fetchStudents = useCallback(async ({ showSpinner = true } = {}) => {
    if (showSpinner) setLoading(true);
    setLoadError("");
    try {
      const res = await API.get("/students");
      // An empty array is a valid answer — it must not fall back to mock data,
      // which made a truly empty roster look populated.
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setStudents([]);
      setLoadError(err.userMessage || "Could not load the student roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchStudents({ showSpinner: false });
    })();
    return () => { cancelled = true; };
  }, [fetchStudents]);

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const closeModal = () => {
    setModal(null);
    setCurrent(null);
    setFieldErrors({});
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModal("add");
  };

  const openEdit = (student) => {
    setCurrent(student);
    setForm({
      name: student.name || "",
      email: student.email || "",
      rollNumber: student.rollNumber || "",
      department: student.department || DEPARTMENTS[0],
      semester: String(student.semester ?? 1),
      phone: student.phone || "",
      status: student.status || "Active",
    });
    setFieldErrors({});
    setModal("edit");
  };

  /** Payload for the API — deliberately excludes `_id`. */
  const buildPayload = () => ({
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    rollNumber: form.rollNumber.trim(),
    department: form.department,
    semester: Number(form.semester),
    phone: form.phone.trim(),
    status: form.status,
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/students", buildPayload());
      setStudents((prev) => [res.data, ...prev]);
      toasts.success(`${res.data.name} was added to the roster.`);
      closeModal();
    } catch (err) {
      // A failure is reported as a failure. It used to be swallowed and
      // announced as success while the record was never persisted.
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toasts.error(err.userMessage || "Could not add the student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!current) return;

    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.put(`/students/${current._id}`, buildPayload());
      setStudents((prev) => prev.map((s) => (s._id === current._id ? res.data : s)));
      toasts.success(`${res.data.name}'s record was updated.`);
      closeModal();
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toasts.error(err.userMessage || "Could not update the student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;

    setSubmitting(true);
    try {
      await API.delete(`/students/${current._id}`);
      // Only remove from the UI once the server confirms it.
      setStudents((prev) => prev.filter((s) => s._id !== current._id));
      toasts.success(`${current.name} was removed from the roster.`);
      closeModal();
    } catch (err) {
      toasts.error(err.userMessage || "Could not delete the student.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("ALL");
    setSelectedSemester("ALL");
    setSelectedStatus("ALL");
  };

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const matchesSearch =
        !query ||
        [s.name, s.email, s.department, s.phone, s.rollNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query));

      return (
        matchesSearch &&
        (selectedDepartment === "ALL" || s.department === selectedDepartment) &&
        (selectedSemester === "ALL" || String(s.semester) === selectedSemester) &&
        (selectedStatus === "ALL" || s.status === selectedStatus)
      );
    });
  }, [students, searchQuery, selectedDepartment, selectedSemester, selectedStatus]);

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.status === "Active").length,
      inactive: students.filter((s) => s.status === "Inactive").length,
      departments: new Set(students.map((s) => s.department).filter(Boolean)).size,
    }),
    [students]
  );

  const departmentOptions = useMemo(() => {
    const fromData = students.map((s) => s.department).filter(Boolean);
    return Array.from(new Set([...DEPARTMENTS, ...fromData])).sort();
  }, [students]);

  const hasFilters =
    searchQuery ||
    selectedDepartment !== "ALL" ||
    selectedSemester !== "ALL" ||
    selectedStatus !== "ALL";

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="app-main">
        <Navbar
          title="Student Roster"
          subtitle="Registrations, enrolment and academic status"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="app-body">
          <div className="page-head">
            <div className="page-head-title">
              <span className="page-head-icon">
                <FaUserGraduate />
              </span>
              <div>
                <h2 className="page-title">Student Management</h2>
                <p className="page-subtitle">
                  {loading
                    ? "Loading roster…"
                    : `${stats.total} student${stats.total === 1 ? "" : "s"} on record`}
                </p>
              </div>
            </div>
            <div className="page-head-actions">
              <button className="btn btn-secondary" onClick={() => fetchStudents()} disabled={loading}>
                <FaSyncAlt /> Refresh
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                <FaPlus /> Add student
              </button>
            </div>
          </div>

          {loadError && (
            <div className="alert alert-error" role="alert">
              <FaExclamationTriangle />
              <div className="alert-body">
                <div className="alert-title">Roster unavailable</div>
                <div>{loadError}</div>
              </div>
              <button className="btn btn-sm btn-danger-soft" onClick={() => fetchStudents()}>
                Retry
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="stat-grid">
            <StatTile tone="tile-primary" icon={<FaUserGraduate />} value={stats.total} label="Total registered" loading={loading} />
            <StatTile tone="tile-green" icon={<FaUserCheck />} value={stats.active} label="Active students" loading={loading} />
            <StatTile tone="tile-amber" icon={<FaUserTimes />} value={stats.inactive} label="Inactive students" loading={loading} />
            <StatTile tone="tile-blue" icon={<FaBuilding />} value={stats.departments} label="Departments" loading={loading} />
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-search">
              <div className="input-wrap">
                <FaSearch />
                <input
                  className="input"
                  type="search"
                  placeholder="Search by name, email, roll number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search students"
                />
              </div>
            </div>

            <div className="toolbar-filters">
              <select
                className="select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="ALL">All departments</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                className="select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                aria-label="Filter by semester"
              >
                <option value="ALL">All semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={String(s)}>Semester {s}</option>
                ))}
              </select>

              <select
                className="select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {hasFilters && (
                <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
                  <FaTimes /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-left">
                <FaUserGraduate className="card-head-icon" />
                <div>
                  <h3 className="card-title">Roster</h3>
                  <p className="card-subtitle">
                    Showing {filtered.length} of {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div className="card-body">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-row" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon"><FaUserGraduate /></span>
                  <p className="empty-title">
                    {stats.total === 0 ? "No students yet" : "No matches"}
                  </p>
                  <p className="empty-text">
                    {stats.total === 0
                      ? "Add your first student to start building the roster."
                      : "Try a different search term or clear the filters."}
                  </p>
                  {stats.total === 0 ? (
                    <button className="btn btn-primary" onClick={openAdd}>
                      <FaPlus /> Add student
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={resetFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll no.</th>
                      <th>Department</th>
                      <th>Sem</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th className="td-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
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
                        <td className="tabular">{s.rollNumber || "—"}</td>
                        <td>{s.department}</td>
                        <td className="tabular">{s.semester}</td>
                        <td className="tabular">{s.phone}</td>
                        <td>
                          <span
                            className={`badge ${
                              s.status === "Active" ? "badge-success" : "badge-neutral"
                            }`}
                          >
                            <span className="dot" /> {s.status}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn btn-icon"
                            onClick={() => { setCurrent(s); setModal("view"); }}
                            aria-label={`View ${s.name}`}
                            title="View"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={() => openEdit(s)}
                            aria-label={`Edit ${s.name}`}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          {canDelete && (
                            <button
                              className="btn btn-icon btn-icon-danger"
                              onClick={() => { setCurrent(s); setModal("delete"); }}
                              aria-label={`Delete ${s.name}`}
                              title="Delete"
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit ─────────────────────────────────────────── */}
      {(modal === "add" || modal === "edit") && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal modal-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-title"
          >
            <form onSubmit={modal === "add" ? handleAdd : handleEdit} noValidate>
              <div className="modal-head">
                <div className="modal-head-left">
                  <span className="modal-head-icon">
                    {modal === "add" ? <FaPlus /> : <FaEdit />}
                  </span>
                  <div>
                    <h3 className="modal-title" id="student-form-title">
                      {modal === "add" ? "Add student" : "Edit student"}
                    </h3>
                    <p className="modal-sub">
                      {modal === "add"
                        ? "Register a new student on the roster."
                        : `Updating ${current?.name}`}
                    </p>
                  </div>
                </div>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid">
                  <Field label="Full name" required error={fieldErrors.name}>
                    <input
                      className={`input ${fieldErrors.name ? "has-error" : ""}`}
                      name="name"
                      value={form.name}
                      onChange={setField}
                      placeholder="e.g. Rahul Verma"
                    />
                  </Field>

                  <Field label="Email" required error={fieldErrors.email}>
                    <input
                      className={`input ${fieldErrors.email ? "has-error" : ""}`}
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={setField}
                      placeholder="student@institution.edu"
                    />
                  </Field>

                  <Field label="Roll number" error={fieldErrors.rollNumber}>
                    <input
                      className="input"
                      name="rollNumber"
                      value={form.rollNumber}
                      onChange={setField}
                      placeholder="e.g. CSE-2022-084"
                    />
                  </Field>

                  <Field label="Phone" required error={fieldErrors.phone}>
                    <input
                      className={`input ${fieldErrors.phone ? "has-error" : ""}`}
                      name="phone"
                      value={form.phone}
                      onChange={setField}
                      placeholder="+91 98765 43210"
                    />
                  </Field>

                  <Field label="Department" required error={fieldErrors.department}>
                    <select className="select" name="department" value={form.department} onChange={setField}>
                      {departmentOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Semester" required error={fieldErrors.semester}>
                    <select
                      className={`select ${fieldErrors.semester ? "has-error" : ""}`}
                      name="semester"
                      value={form.semester}
                      onChange={setField}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={String(s)}>Semester {s}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Status">
                    <select className="select" name="status" value={form.status} onChange={setField}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting && <span className="spinner" />}
                  {modal === "add" ? "Add student" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View ───────────────────────────────────────────────── */}
      {modal === "view" && current && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="avatar avatar-lg avatar-student">{initials(current.name)}</span>
                <div>
                  <h3 className="modal-title">{current.name}</h3>
                  <p className="modal-sub">{current.department}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <dl className="detail-list">
                <DetailRow icon={<FaEnvelope />} label="Email" value={current.email} />
                <DetailRow icon={<FaIdBadge />} label="Roll number" value={current.rollNumber || "—"} />
                <DetailRow icon={<FaPhone />} label="Phone" value={current.phone} />
                <DetailRow icon={<FaBookOpen />} label="Semester" value={`Semester ${current.semester}`} />
                <DetailRow icon={<FaBuilding />} label="Department" value={current.department} />
                <DetailRow
                  icon={<FaUserCheck />}
                  label="Status"
                  value={
                    <span className={`badge ${current.status === "Active" ? "badge-success" : "badge-neutral"}`}>
                      <span className="dot" /> {current.status}
                    </span>
                  }
                />
              </dl>
            </div>

            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
              <button className="btn btn-primary" onClick={() => openEdit(current)}>
                <FaEdit /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete ─────────────────────────────────────────────── */}
      {modal === "delete" && current && (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="modal-head-icon is-danger"><FaExclamationTriangle /></span>
                <div>
                  <h3 className="modal-title">Delete student?</h3>
                  <p className="modal-sub">This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                <strong>{current.name}</strong> ({current.email}) will be permanently
                removed from the roster.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                {submitting && <span className="spinner" />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small local building blocks ─────────────────────────────── */

function initials(name) {
  if (!name) return "??";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function StatTile({ tone, icon, value, label, loading }) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span className="stat-tile-icon">{icon}</span>
      <div className="stat-tile-body">
        <span className="stat-value">{loading ? "—" : value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="detail-row">
      <dt>
        <span className="detail-icon">{icon}</span>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
