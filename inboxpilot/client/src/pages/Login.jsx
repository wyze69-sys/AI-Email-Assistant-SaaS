import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getGoogleLoginURL } from "../services/auth.js";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>InboxPilot</h1>
        <p>AI-powered email assistant for your Gmail inbox.</p>
        <a href={getGoogleLoginURL()} className="btn-google">
          Sign in with Google
        </a>
        <p className="login-note">
          Read-only access — InboxPilot will never send emails on your behalf.
        </p>
      </div>
    </div>
  );
}
