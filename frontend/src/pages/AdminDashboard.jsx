import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";
import API from "../services/api";
import { getStoredTests, getStoredSubmissions, getStoredResults } from "../services/storage";
import "../styles/dashboard.css";

const DEFAULT_STUDENTS = [
  { id: "std_1", name: "Rahul Verma", department: "Computer Science (4th Sem)", status: "Active • Exam Enrolled" },
  { id: "std_2", name: "Anjali Sharma", department: "Information Technology", status: "Active • Graded" },
  { id: "std_3", name: "Vikram Singh", department: "Electronics Engineering", status: "Active • Exam Enrolled" },
  { id: "std_4", name: "Neha Gupta", department: "Computer Science & AI", status: "Active • Graded" },
  { id: "std_5", name: "Arjun Patel", department: "Data Science", status: "Active • Pending Review" },
];

function AdminDashboard() {
  const [students, setStudents] = useState(DEFAULT_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [testsCount, setTestsCount] = useState(7);
  const [resultsCount, setResultsCount] = useState(5);

  useEffect(() => {
    fetchStudents();
    setTestsCount(getStoredTests().length);
    setResultsCount(getStoredResults().length);
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await API.get("/students");
      if (res.data && res.data.length > 0) {
        setStudents(res.data);
      }
    } catch (err) {
      // Graceful fallback to default mock list
      setStudents(DEFAULT_STUDENTS);
    }
  };

  return (
    <div className="admin-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="main-content">
        <Navbar
          title="Admin Overview"
          subtitle="Manage students, faculty, tests and system analytics"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="cards">
          <DashboardCard
            title="Active Students"
            count={loading ? "..." : String(students.length + 150)}
          />
          <DashboardCard title="Faculty Members" count="18" />
          <DashboardCard title="Total Assessments" count={String(testsCount)} />
          <DashboardCard title="Published Results" count={String(resultsCount + 300)} />
        </div>

        <div className="dashboard-grid">
          <div className="activity">
            <h2>Recent Activity</h2>

            <div className="activity-item">🟢 New Student Registered</div>
            <div className="activity-item">📝 Java Test Created</div>
            <div className="activity-item">📊 Results Published</div>
            <div className="activity-item">👨‍🏫 Faculty Added</div>
          </div>

          <div className="students">
            <h2>Recent Students</h2>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student._id || student.id}>
                    <td>{student.name}</td>
                    <td>{student.department}</td>
                    <td>{student.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;