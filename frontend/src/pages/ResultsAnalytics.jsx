import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
  FaUser,
  FaClipboardCheck,
  FaChartLine,
  FaTrophy,
  FaFilter,
  FaFileExport,
  FaDownload,
} from "react-icons/fa";
import { getStoredResults } from "../services/storage";
import "../styles/results.css";

const TOP_PERFORMERS = [
  { rank: 1, name: "Rahul Verma", test: "Java Programming", score: "95%" },
  { rank: 2, name: "Anjali Sharma", test: "Data Structures", score: "92%" },
  { rank: 3, name: "Vikram Singh", test: "Web Development", score: "90%" },
  { rank: 4, name: "Neha Gupta", test: "DBMS Fundamentals", score: "88%" },
  { rank: 5, name: "Arjun Patel", test: "Operating Systems", score: "85%" },
];

function ResultsAnalytics() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resultsList, setResultsList] = useState(() => getStoredResults());
  const [selectedTest, setSelectedTest] = useState("All Tests");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");

  useEffect(() => {
    setResultsList(getStoredResults());
  }, []);

  const filteredResults = resultsList.filter((r) => {
    const testMatch = selectedTest === "All Tests" || (r.title || r.test) === selectedTest;
    const subjMatch = selectedSubject === "All Subjects" || (r.subject || "Computer Science") === selectedSubject;
    return testMatch && subjMatch;
  });

  const handleExportCSV = () => {
    const headers = "ID,Student Name,Test Title,Score,Date,Evaluator\n";
    const rows = filteredResults
      .map(
        (r, i) =>
          `"${i + 1}","${r.student || "Rahul Verma"}","${r.title || r.test}","${r.score}","${r.date}","${r.reviewer || "Dr. Johnson"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `smartassess_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = [
    { id: 1, title: "Total Students", count: "156", icon: FaUser, colorClass: "card-blue" },
    { id: 2, title: "Tests Completed", count: "92", icon: FaClipboardCheck, colorClass: "card-green" },
    { id: 3, title: "Average Score", count: "78%", icon: FaChartLine, colorClass: "card-orange" },
    { id: 4, title: "Top Performers", count: "35", icon: FaTrophy, colorClass: "card-purple" },
  ];

  return (
    <div className="results-layout-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="results-main-content">
        <Navbar
          title="Results Dashboard"
          subtitle="Overview of student performance"
          onToggleMobileSidebar={() => setMobileOpen(true)}
        />

        <div className="results-dashboard-body">
          {/* Top Control Bar */}
          <div className="results-top-controls">
            <div>
              <h2 className="results-title">Results Dashboard</h2>
              <p className="results-sub">Overview of student performance</p>
            </div>
            <div className="results-actions-flex">
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="results-select"
              >
                <option>All Tests</option>
                <option>Java Programming</option>
                <option>Data Structures</option>
                <option>Web Development</option>
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="results-select"
              >
                <option>All Subjects</option>
                <option>Computer Science</option>
                <option>Web Dev</option>
                <option>DBMS</option>
              </select>

              <button className="results-btn btn-filter" onClick={() => { setSelectedTest("All Tests"); setSelectedSubject("All Subjects"); }}>
                <FaFilter /> Reset
              </button>
              <button className="results-btn btn-export" onClick={handleExportCSV}>
                <FaFileExport /> Export CSV
              </button>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="results-stats-grid">
            {stats.map((st) => {
              const IconComp = st.icon;
              return (
                <div key={st.id} className={`res-stat-card ${st.colorClass}`}>
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

          {/* ROW 1: Top Performers & Performance Distribution */}
          <div className="results-grid-row">
            {/* Top Performers Table */}
            <div className="res-card">
              <div className="res-card-header">
                <h3 className="res-card-title">Top Performers</h3>
                <a href="#all" className="res-view-all">View All</a>
              </div>
              <div className="res-card-body table-responsive">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student Name</th>
                      <th>Test</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_PERFORMERS.map((p) => (
                      <tr key={p.rank}>
                        <td className="font-bold text-slate-500">{p.rank}</td>
                        <td className="font-semibold text-slate-800">{p.name}</td>
                        <td>{p.test}</td>
                        <td className="font-bold text-green-600">{p.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Distribution Donut Chart */}
            <div className="res-card">
              <div className="res-card-header">
                <h3 className="res-card-title">Performance Distribution</h3>
              </div>
              <div className="res-card-body donut-chart-container">
                <div className="donut-chart-svg-wrap">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    {/* Above 90% - 20% (Purple #7c3aed) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#7c3aed" strokeWidth="16" strokeDasharray="48 191" strokeDashoffset="0" />
                    {/* 75%-90% - 40% (Green #10b981) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="95 144" strokeDashoffset="-48" />
                    {/* 50%-75% - 25% (Yellow/Orange #f59e0b) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="60 179" strokeDashoffset="-143" />
                    {/* Below 50% - 15% (Pink/Red #ef4444) */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="16" strokeDasharray="36 203" strokeDashoffset="-203" />
                  </svg>
                </div>

                <div className="chart-legend-list">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: "#7c3aed" }}></span>
                    <span className="legend-label">Above 90%</span>
                    <span className="legend-val">20%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: "#10b981" }}></span>
                    <span className="legend-label">75% - 90%</span>
                    <span className="legend-val">40%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: "#f59e0b" }}></span>
                    <span className="legend-label">50% - 75%</span>
                    <span className="legend-val">25%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: "#ef4444" }}></span>
                    <span className="legend-label">Below 50%</span>
                    <span className="legend-val">15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Recent Results Table */}
          <div className="res-card">
            <div className="res-card-header">
              <h3 className="res-card-title">Recent Test Results ({filteredResults.length})</h3>
              <span className="text-xs text-slate-400">Live Evaluated Submissions</span>
            </div>
            <div className="res-card-body table-responsive">
              <table className="res-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Test</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-slate-400">
                        No results match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.id}>
                        <td className="font-semibold text-slate-200">{r.student || "Rahul Verma"}</td>
                        <td>{r.title || r.test}</td>
                        <td className="font-bold text-green-400">{r.score}</td>
                        <td>{r.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResultsAnalytics;
