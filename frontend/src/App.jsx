import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

import Login             from "./pages/Login";
import AdminDashboard    from "./pages/AdminDashboard";
import FacultyDashboard  from "./pages/FacultyDashboard";
import StudentDashboard  from "./pages/StudentDashboard";
import StudentManagement from "./pages/StudentManagement";
import TestDashboard     from "./pages/TestDashboard";
import Settings          from "./pages/Settings";
import ResultsAnalytics  from "./pages/ResultsAnalytics";
import TakeTest          from "./pages/TakeTest";

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/"          element={<Login />} />
        <Route path="/admin"     element={<AdminDashboard />} />
        <Route path="/faculty"   element={<FacultyDashboard />} />
        <Route path="/student"   element={<StudentDashboard />} />
        <Route path="/students"  element={<StudentManagement />} />
        <Route path="/tests"     element={<TestDashboard />} />
        <Route path="/results"   element={<ResultsAnalytics />} />
        <Route path="/take-test" element={<TakeTest />} />
        <Route path="/settings"  element={<Settings />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;