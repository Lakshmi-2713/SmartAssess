import { useState, useEffect, useMemo } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
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
} from "react-icons/fa";
import "../styles/students.css";

const DEPARTMENTS_LIST = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Data Science",
  "Artificial Intelligence",
];

const INITIAL_FORM = {
  name: "",
  email: "",
  department: "Computer Science",
  semester: "1",
  phone: "",
  status: "Active",
};

const DEFAULT_MOCK_STUDENTS = [
  { _id: "s1", name: "Rahul Verma", email: "rahul.verma@student.com", department: "Computer Science", semester: 4, phone: "+91 98765 43210", status: "Active" },
  { _id: "s2", name: "Anjali Sharma", email: "anjali.s@student.com", department: "Information Technology", semester: 4, phone: "+91 98765 43211", status: "Active" },
  { _id: "s3", name: "Vikram Singh", email: "vikram.s@student.com", department: "Electronics & Communication", semester: 6, phone: "+91 98765 43212", status: "Active" },
  { _id: "s4", name: "Neha Gupta", email: "neha.g@student.com", department: "Computer Science", semester: 4, phone: "+91 98765 43213", status: "Active" },
  { _id: "s5", name: "Arjun Patel", email: "arjun.p@student.com", department: "Data Science", semester: 2, phone: "+91 98765 43214", status: "Inactive" },
  { _id: "s6", name: "Pooja Hegde", email: "pooja.h@student.com", department: "Artificial Intelligence", semester: 4, phone: "+91 98765 43215", status: "Active" },
  { _id: "s7", name: "Rohan Kulkarni", email: "rohan.k@student.com", department: "Mechanical Engineering", semester: 6, phone: "+91 98765 43216", status: "Active" },
];

function StudentManagement() {
  const [students, setStudents] = useState(DEFAULT_MOCK_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedSemester, setSelectedSemester] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active item state for edit/view/delete
  const [currentStudent, setCurrentStudent] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: "", message: "" });
    }, 4000);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await API.get("/students");
      if (res.data && res.data.length > 0) {
        setStudents(res.data);
      }
    } catch (err) {
      console.warn("Using mock student data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData(INITIAL_FORM);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (student) => {
    setCurrentStudent(student);
    setFormData({
      name: student.name || "",
      email: student.email || "",
      department: student.department || "Computer Science",
      semester: String(student.semester || 1),
      phone: student.phone || "",
      status: student.status || "Active",
    });
    setShowEditModal(true);
  };

  // Open View Modal
  const openViewModal = (student) => {
    setCurrentStudent(student);
    setShowViewModal(true);
  };

  // Open Delete Modal
  const openDeleteModal = (student) => {
    setCurrentStudent(student);
    setShowDeleteModal(true);
  };

  // Submit Add Student
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showAlert("error", "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const newStudent = {
      _id: `std_${Date.now()}`,
      ...formData,
      semester: Number(formData.semester),
    };

    try {
      const res = await API.post("/students", newStudent);
      setStudents((prev) => [res.data, ...prev]);
    } catch {
      setStudents((prev) => [newStudent, ...prev]);
    } finally {
      setShowAddModal(false);
      setFormData(INITIAL_FORM);
      showAlert("success", "Student registered successfully!");
      setSubmitting(false);
    }
  };

  // Submit Edit Student
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentStudent) return;

    setSubmitting(true);
    const updated = {
      ...currentStudent,
      ...formData,
      semester: Number(formData.semester),
    };

    try {
      const res = await API.put(`/students/${currentStudent._id}`, updated);
      setStudents((prev) =>
        prev.map((s) => (s._id === currentStudent._id ? res.data : s))
      );
    } catch {
      setStudents((prev) =>
        prev.map((s) => (s._id === currentStudent._id ? updated : s))
      );
    } finally {
      setShowEditModal(false);
      setCurrentStudent(null);
      showAlert("success", "Student details updated successfully!");
      setSubmitting(false);
    }
  };

  // Confirm Delete Student
  const handleDeleteConfirm = async () => {
    if (!currentStudent) return;

    setSubmitting(true);
    try {
      await API.delete(`/students/${currentStudent._id}`);
    } catch {
      // ignore
    } finally {
      setStudents((prev) => prev.filter((s) => s._id !== currentStudent._id));
      setShowDeleteModal(false);
      setCurrentStudent(null);
      showAlert("success", "Student record deleted.");
      setSubmitting(false);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("ALL");
    setSelectedSemester("ALL");
    setSelectedStatus("ALL");
  };

  // Filtered Students Calculation
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.department?.toLowerCase().includes(query) ||
        student.phone?.toLowerCase().includes(query);

      const matchesDepartment =
        selectedDepartment === "ALL" || student.department === selectedDepartment;

      const matchesSemester =
        selectedSemester === "ALL" || String(student.semester) === selectedSemester;

      const matchesStatus =
        selectedStatus === "ALL" || student.status === selectedStatus;

      return matchesSearch && matchesDepartment && matchesSemester && matchesStatus;
    });
  }, [students, searchQuery, selectedDepartment, selectedSemester, selectedStatus]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === "Active").length;
    const inactive = students.filter((s) => s.status === "Inactive").length;
    const uniqueDepts = new Set(students.map((s) => s.department)).size;
    return { total, active, inactive, uniqueDepts };
  }, [students]);

  // Extract all existing unique department options combining predefined list
  const availableDepartments = useMemo(() => {
    const deptsFromData = students.map((s) => s.department).filter(Boolean);
    const combined = Array.from(new Set([...DEPARTMENTS_LIST, ...deptsFromData]));
    return combined.sort();
  }, [students]);

  return (
    <div className="admin-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-content">
        <Navbar
          title="Student Roster Management"
          subtitle="Manage student registrations, academic records, and access status"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        {/* Page Header */}
        <div className="student-header">
          <div>
            <h1 className="header-title">Student Management Roster</h1>
            <p className="header-subtitle">
              Manage student registrations, department enrollments, and academic status
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAddModal}>
            <FaPlus /> Add New Student
          </button>
        </div>

        {/* Alert Feedback Banner */}
        {alert.message && (
          <div className={`alert-banner alert-${alert.type}`}>
            <span>{alert.message}</span>
            <button className="alert-close" onClick={() => setAlert({ type: "", message: "" })}>
              <FaTimes />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon-wrapper">
              <FaUserGraduate />
            </div>
            <div>
              <p className="stat-label">Total Registered</p>
              <h3 className="stat-value">{loading ? "..." : stats.total}</h3>
            </div>
          </div>

          <div className="stat-card stat-active">
            <div className="stat-icon-wrapper">
              <FaUserCheck />
            </div>
            <div>
              <p className="stat-label">Active Students</p>
              <h3 className="stat-value">{loading ? "..." : stats.active}</h3>
            </div>
          </div>

          <div className="stat-card stat-inactive">
            <div className="stat-icon-wrapper">
              <FaUserTimes />
            </div>
            <div>
              <p className="stat-label">Inactive Students</p>
              <h3 className="stat-value">{loading ? "..." : stats.inactive}</h3>
            </div>
          </div>

          <div className="stat-card stat-dept">
            <div className="stat-icon-wrapper">
              <FaBuilding />
            </div>
            <div>
              <p className="stat-label">Academic Departments</p>
              <h3 className="stat-value">{loading ? "..." : stats.uniqueDepts}</h3>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar Toolbar */}
        <div className="toolbar-container">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search student by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                <FaTimes />
              </button>
            )}
          </div>

          <div className="filters-group">
            {/* Department Filter */}
            <div className="filter-item">
              <label>Department:</label>
              <select
                className="select-input"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="filter-item">
              <label>Semester:</label>
              <select
                className="select-input"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-item">
              <label>Status:</label>
              <select
                className="select-input"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(selectedDepartment !== "ALL" ||
              selectedSemester !== "ALL" ||
              selectedStatus !== "ALL" ||
              searchQuery) && (
                <button className="btn btn-secondary btn-reset" onClick={resetFilters}>
                  <FaSyncAlt /> Reset
                </button>
              )}
          </div>
        </div>

        {/* Student Records Data Table */}
        <div className="table-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      <div className="spinner"></div> Loading student roster...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      <FaUserGraduate className="empty-icon" />
                      <p>No students match the selected search or filter criteria.</p>
                      {(searchQuery || selectedDepartment !== "ALL" || selectedSemester !== "ALL" || selectedStatus !== "ALL") && (
                        <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student._id}>
                      <td className="font-semibold text-white">
                        <div className="student-avatar-row">
                          <div className="avatar-circle">
                            {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td className="text-gray">{student.email}</td>
                      <td>
                        <span className="dept-tag">{student.department}</span>
                      </td>
                      <td>Semester {student.semester}</td>
                      <td className="text-gray">{student.phone}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            student.status === "Active" ? "status-active" : "status-inactive"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-view"
                            title="View Profile Details"
                            onClick={() => openViewModal(student)}
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn-icon btn-edit"
                            title="Edit Student Information"
                            onClick={() => openEditModal(student)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            title="Delete Student"
                            onClick={() => openDeleteModal(student)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- ADD STUDENT MODAL --- */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Register New Student</h3>
                <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Rahul Verma"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="e.g. rahul.verma@student.com"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                      >
                        {DEPARTMENTS_LIST.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Semester *</label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={String(s)}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="text"
                        name="phone"
                        required
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Register Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT STUDENT MODAL --- */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Edit Student Details</h3>
                <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                      >
                        {DEPARTMENTS_LIST.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Semester *</label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={String(s)}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="text"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- VIEW STUDENT MODAL --- */}
        {showViewModal && currentStudent && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Student Profile View</h3>
                <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="student-profile-view">
                  <div className="profile-badge-avatar">
                    {currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : "S"}
                  </div>
                  <h4>{currentStudent.name}</h4>
                  <span
                    className={`status-pill ${
                      currentStudent.status === "Active" ? "status-active" : "status-inactive"
                    }`}
                  >
                    {currentStudent.status} Student
                  </span>

                  <div className="view-details-grid">
                    <div className="view-detail-card">
                      <FaEnvelope className="view-icon text-indigo" />
                      <div>
                        <span className="view-label">Email Address</span>
                        <strong>{currentStudent.email}</strong>
                      </div>
                    </div>

                    <div className="view-detail-card">
                      <FaPhone className="view-icon text-emerald" />
                      <div>
                        <span className="view-label">Phone Number</span>
                        <strong>{currentStudent.phone}</strong>
                      </div>
                    </div>

                    <div className="view-detail-card">
                      <FaBuilding className="view-icon text-blue" />
                      <div>
                        <span className="view-label">Department</span>
                        <strong>{currentStudent.department}</strong>
                      </div>
                    </div>

                    <div className="view-detail-card">
                      <FaBookOpen className="view-icon text-purple" />
                      <div>
                        <span className="view-label">Academic Semester</span>
                        <strong>Semester {currentStudent.semester} (Undergraduate)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(currentStudent);
                  }}
                >
                  <FaEdit /> Edit Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DELETE CONFIRM MODAL --- */}
        {showDeleteModal && currentStudent && (
          <div className="modal-overlay">
            <div className="modal-content modal-confirm">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
                <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete student record for{" "}
                  <strong>{currentStudent.name}</strong>?
                </p>
                <p className="delete-warn-text">
                  This action cannot be undone. All test attendance and records associated with this
                  account will be unlinked.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={submitting}
                >
                  {submitting ? "Deleting..." : "Delete Student"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentManagement;
