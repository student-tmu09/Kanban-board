import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconKanban,
  IconSparkles,
  IconCheck
} from "../components/Icons";

export default function Login() {
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: location.state?.email || "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please fill in both email and password");
      return;
    }

    try {
      setLoading(true);
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password
      });

      showToast("Welcome back! Redirecting...", "success");
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.requireOtp) {
        showToast("Please verify your Gmail with the OTP sent to your inbox", "info");
        navigate("/register", {
          state: {
            verifyEmail: form.email.trim().toLowerCase(),
            initialStep: "otp"
          }
        });
        return;
      }
      const msg = !err.response
        ? "Backend server (port 3000) se connect nahi ho pa raha hai. Please server check karein."
        : err.response.data?.message || "Invalid email or password. Please try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left visual showcase */}
      <div className="auth-showcase">
        <div className="showcase-glow" />
        <div className="showcase-content">
          <div className="showcase-badge">
            <IconSparkles size={16} />
            <span>Welcome to Kanban Flow</span>
          </div>

          <h1 className="showcase-title">
            Organize work, manage sprints, and <span>ship faster</span>
          </h1>
          <p className="showcase-subtitle">
            The modern, real-time board system for high-velocity teams. Pick up right where you left off.
          </p>

          <div className="showcase-mockup">
            <div className="mockup-header">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span className="mockup-title">Team Dashboard</span>
            </div>
            <div className="mockup-kanban">
              <div className="mock-column">
                <div className="mock-col-header">
                  <span className="mock-pill mock-pill-progress">IN REVIEW</span>
                  <span className="mock-count">1</span>
                </div>
                <div className="mock-card mock-card-active">
                  <div className="mock-card-title">User Avatars & Auth UI</div>
                  <div className="mock-card-footer">
                    <span className="mock-avatar">⚡</span>
                    <span className="mock-tag">High</span>
                  </div>
                </div>
              </div>

              <div className="mock-column">
                <div className="mock-col-header">
                  <span className="mock-pill mock-pill-done">DONE</span>
                  <span className="mock-count">4</span>
                </div>
                <div className="mock-card">
                  <div className="mock-card-title">Workspace API & Sockets</div>
                  <div className="mock-card-footer">
                    <span className="mock-avatar">🚀</span>
                    <span className="mock-tag">Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-features">
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Real-time WebSocket task sync</span>
            </div>
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Granular workspace roles & permissions</span>
            </div>
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Full activity tracking & comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form side */}
      <div className="auth-form-side">
        <div className="auth-card-modern">
          <div className="auth-header">
            <div className="auth-brand">
              <div className="brand-icon-box">
                <IconKanban size={22} />
              </div>
              <span>KANBAN<b>FLOW</b></span>
            </div>
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your workspaces</p>
          </div>

          {error && (
            <div className="auth-alert error-alert">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="modern-form">
            {/* EMAIL */}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <IconMail size={18} />
                </span>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                  className="input-field"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <div className="label-row">
                <label className="input-label">Password</label>
              </div>
              <div className="input-with-icon">
                <span className="field-icon">
                  <IconLock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="submit-button primary-gradient-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Logging you in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="auth-switch-link">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
