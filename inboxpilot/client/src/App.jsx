import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { captureTokenFromURL, isAuthenticated } from "./services/auth.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EmailDetail from "./pages/EmailDetail.jsx";

function ProtectedRoute({ children }) {
  captureTokenFromURL();

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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
