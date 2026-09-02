import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteGuard from "./components/RouteGuard";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentManagement from "./pages/StudentManagement";
import TestDashboard from "./pages/TestDashboard";
import Settings from "./pages/Settings";
import ResultsAnalytics from "./pages/ResultsAnalytics";
import TakeTest from "./pages/TakeTest";
import NotFound from "./pages/NotFound";

const STAFF = ["faculty", "admin"];
const ALL = ["student", "faculty", "admin"];

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/admin"
            element={
              <RouteGuard roles={["admin"]}>
                <AdminDashboard />
              </RouteGuard>
            }
          />

          <Route
            path="/faculty"
            element={
              <RouteGuard roles={STAFF}>
                <FacultyDashboard />
              </RouteGuard>
            }
          />

          <Route
            path="/student"
            element={
              <RouteGuard roles={ALL}>
                <StudentDashboard />
              </RouteGuard>
            }
          />

          {/* Roster management is staff-only. */}
          <Route
            path="/students"
            element={
              <RouteGuard roles={STAFF}>
                <StudentManagement />
              </RouteGuard>
            }
          />

          <Route
            path="/tests"
            element={
              <RouteGuard roles={ALL}>
                <TestDashboard />
              </RouteGuard>
            }
          />

          <Route
            path="/results"
            element={
              <RouteGuard roles={ALL}>
                <ResultsAnalytics />
              </RouteGuard>
            }
          />

          <Route
            path="/take-test"
            element={
              <RouteGuard roles={ALL}>
                <TakeTest />
              </RouteGuard>
            }
          />

          <Route
            path="/settings"
            element={
              <RouteGuard roles={ALL}>
                <Settings />
              </RouteGuard>
            }
          />

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
