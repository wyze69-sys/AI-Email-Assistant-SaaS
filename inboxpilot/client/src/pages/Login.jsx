import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getGoogleLoginURL } from "../services/auth.js";

const FEATURES = [
  {
    icon: "✦",
    title: "Summarize long messages",
    desc: "Get the key points and tone of an email in seconds.",
  },
  {
    icon: "☑",
    title: "Extract deadlines and action items",
    desc: "Pull tasks and due dates out of dense threads.",
  },
  {
    icon: "✉",
    title: "Draft a reply to review",
    desc: "Get a starting draft you read and edit before sending.",
  },
];

const TRUST = [
  "Read-only Gmail access",
  "No automatic sending",
  "You review every AI reply",
];

export default function Login() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Show a clear message if the OAuth round-trip failed.
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthError(
        "Google sign-in didn't complete. Try again. If this keeps happening, make sure your Google account has been added as a test user."
      );
      // Clean the error param from the URL so it doesn't persist on refresh.
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [navigate]);

  return (
    <main className="auth-page">
      <div className="auth-container">
        <section className="auth-hero enter-1">
          <div className="brand">
            <span className="brand-mark">IP</span>
            InboxPilot
          </div>
          <h1 className="auth-title">Review your inbox faster.</h1>
          <p className="auth-subtitle">
            InboxPilot connects to Gmail and helps you understand emails,
            surface deadlines, and draft replies you stay in control of.
          </p>

          <ul className="feature-preview">
            {FEATURES.map((f) => (
              <li className="feature-item" key={f.title}>
                <span className="feature-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-card enter-2" aria-label="Sign in">
          <h2>Sign in</h2>
          <p className="auth-card-sub">
            Use your Google account to connect your Gmail inbox.
          </p>

          {authError && (
            <div className="auth-error" role="alert">
              {authError}
            </div>
          )}

          <a href={getGoogleLoginURL()} className="btn-google">
            <svg
              className="google-icon"
              viewBox="0 0 18 18"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
              />
            </svg>
            Sign in with Google
          </a>

          <div className="readonly-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              InboxPilot reads your emails to help you. It never sends, deletes,
              or changes anything in your account.
            </span>
          </div>

          <ul className="trust-list" aria-label="Privacy and safety">
            {TRUST.map((item) => (
              <li key={item}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <p className="auth-fineprint">
            By continuing you allow InboxPilot read-only access to your Gmail
            messages. You can disconnect at any time.
          </p>
        </section>
      </div>
    </main>
  );
}
