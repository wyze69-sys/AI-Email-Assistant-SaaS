import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { captureTokenFromURL, isAuthenticated } from "./services/auth.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EmailDetail from "./pages/EmailDetail.jsx";
import Search from "./pages/Search.jsx";
import TextAssistant from "./pages/TextAssistant.jsx";
import StudyPlanner from "./pages/StudyPlanner.jsx";
import FocusTimer from "./pages/FocusTimer.jsx";
import Tasks from "./pages/Tasks.jsx";
import Notes from "./pages/Notes.jsx";
import Deadlines from "./pages/Deadlines.jsx";
import Resources from "./pages/Resources.jsx";
import Settings from "./pages/Settings.jsx";

/**
 * Capture token from URL ONCE at module load time, before React renders.
 * This guarantees the token is in localStorage before any ProtectedRoute
 * checks isAuthenticated(). Runs exactly once on fresh page load.
 */
captureTokenFromURL();

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emails/:id"
          element={
            <ProtectedRoute>
              <EmailDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/text"
          element={
            <ProtectedRoute>
              <TextAssistant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/study-planner"
          element={
            <ProtectedRoute>
              <StudyPlanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-planner"
          element={
            <ProtectedRoute>
              <StudyPlanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/focus"
          element={
            <ProtectedRoute>
              <FocusTimer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deadlines"
          element={
            <ProtectedRoute>
              <Deadlines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={
            <ProtectedRoute>
              <Resources />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
