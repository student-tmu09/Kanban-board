import React, { useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { registerUser, resendOtp } from "../Api/authApi";
import Avatar from "../components/Avatar";
import {
  PRESET_AVATARS,
  getRandomAvatar,
  compressImage
} from "../utils/avatars";
import {
  IconUser,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconUpload,
  IconRefresh,
  IconSparkles,
  IconCheck,
  IconKanban
} from "../components/Icons";

export default function Register() {
  const { verifyEmailOtp, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  // If user is already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Auth steps: "form" (registration form) | "otp" (email verification input)
  const [step, setStep] = useState("form");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If redirected from Login with unverified email
  React.useEffect(() => {
    if (location.state?.verifyEmail) {
      setVerifyEmail(location.state.verifyEmail);
      setStep("otp");
      setResendCooldown(60);
    }
  }, [location.state]);

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar: PRESET_AVATARS[0].url
  });

  const [avatarMode, setAvatarMode] = useState("presets"); // "presets" | "upload" | "url"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Handle local image file upload & compression
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const compressedDataUrl = await compressImage(file, 280, 0.85);
      setForm((prev) => ({ ...prev, avatar: compressedDataUrl }));
      showToast("Avatar uploaded successfully!", "success");
    } catch (err) {
      setError("Failed to process image. Please try another.");
    } finally {
      setUploading(false);
    }
  };

  const handleRandomize = () => {
    const randomUrl = getRandomAvatar();
    setForm((prev) => ({ ...prev, avatar: randomUrl }));
  };

  // Submit registration details -> Triggers OTP email
  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name) {
      setError("Please enter your name");
      return;
    }
    if (!email) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    if (form.confirmPassword && password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({
        name,
        email,
        password,
        avatar: form.avatar || ""
      });

      const body = res.data?.data || res.data;
      if (body?.requireOtp) {
        // Switch to OTP Input Screen
        setVerifyEmail(email);
        setStep("otp");
        setOtp("");
        setResendCooldown(60);
        showToast("Verification code sent to your Gmail! Please enter it below.", "info");
      } else {
        showToast("Account created successfully! Welcome to your workspace!", "success");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please make sure the backend server and MongoDB are running.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP input by user
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit code received on your Gmail");
      return;
    }

    try {
      setVerifying(true);
      setError("");
      await verifyEmailOtp({ email: verifyEmail, otp: cleanOtp });
      showToast("Gmail verified successfully! Welcome to your workspace 🎉", "success");
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Invalid or expired verification code. Please check your Gmail.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setVerifying(false);
    }
  };

  // Resend OTP to Gmail
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    try {
      setResending(true);
      setError("");
      await resendOtp({ email: verifyEmail });
      showToast("A new 6-digit code has been sent to your Gmail!", "success");
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend code.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setResending(false);
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
            <span>Next-Gen Project Management</span>
          </div>

          <h1 className="showcase-title">
            Collaborate, Track & Ship with <span>Kanban Flow</span>
          </h1>
          <p className="showcase-subtitle">
            Organize tasks, align your team in real time via WebSockets, and build better products faster.
          </p>

          <div className="showcase-mockup">
            <div className="mockup-header">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span className="mockup-title">Sprint 14 Board</span>
            </div>
            <div className="mockup-kanban">
              <div className="mock-column">
                <div className="mock-col-header">
                  <span className="mock-pill mock-pill-todo">TODO</span>
                  <span className="mock-count">3</span>
                </div>
                <div className="mock-card">
                  <div className="mock-card-title">Redesign Auth Flow</div>
                  <div className="mock-card-footer">
                    <span className="mock-avatar">🎨</span>
                    <span className="mock-tag">High</span>
                  </div>
                </div>
                <div className="mock-card">
                  <div className="mock-card-title">Setup Socket.io</div>
                  <div className="mock-card-footer">
                    <span className="mock-avatar">⚡</span>
                    <span className="mock-tag">Done</span>
                  </div>
                </div>
              </div>

              <div className="mock-column">
                <div className="mock-col-header">
                  <span className="mock-pill mock-pill-progress">IN PROGRESS</span>
                  <span className="mock-count">2</span>
                </div>
                <div className="mock-card mock-card-active">
                  <div className="mock-card-title">Realtime Notifications</div>
                  <div className="mock-card-footer">
                    <span className="mock-avatar">🔔</span>
                    <span className="mock-tag">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-features">
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Instant drag & drop sync</span>
            </div>
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Multi-workspace roles & permissions</span>
            </div>
            <div className="feature-item">
              <IconCheck size={16} className="feature-icon" />
              <span>Custom profile avatars</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form side */}
      <div className="auth-form-side">
        <div className="auth-card-modern">
          {step === "otp" ? (
            /* STEP 2: OTP VERIFICATION SCREEN */
            <>
              <div className="auth-header">
                <div className="auth-brand">
                  <div
                    className="brand-icon-box"
                    style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
                  >
                    <IconMail size={22} color="#ffffff" />
                  </div>
                  <span>KANBAN<b>FLOW</b></span>
                </div>
                <h2>Verify your Gmail</h2>
                <p>
                  We have sent a 6-digit verification code to<br />
                  <b style={{ color: "#4f46e5", fontSize: "15px" }}>{verifyEmail}</b>
                </p>
              </div>

              {error && (
                <div className="auth-alert error-alert">
                  <span className="alert-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="modern-form">
                <div className="input-group">
                  <label className="input-label" style={{ textAlign: "center", display: "block" }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(val);
                        if (error) setError("");
                      }}
                      placeholder="123456"
                      autoFocus
                      required
                      className="input-field"
                      style={{
                        fontSize: "28px",
                        fontWeight: "700",
                        letterSpacing: "10px",
                        textAlign: "center",
                        padding: "14px 20px",
                        maxWidth: "280px",
                        borderRadius: "10px",
                        border: "2px solid #6366f1",
                        boxShadow: "0 4px 14px rgba(99, 102, 241, 0.15)",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: "var(--text-muted, #64748b)",
                      marginTop: "8px",
                    }}
                  >
                    Check your Gmail inbox and spam/junk folder for the 6-digit code.
                  </p>
                </div>

                <button
                  type="submit"
                  className="submit-button primary-gradient-btn"
                  disabled={verifying || otp.length < 6}
                >
                  {verifying ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <IconCheck size={18} />
                      <span>Verify Email & Complete Registration</span>
                    </>
                  )}
                </button>

                <div
                  style={{
                    marginTop: "18px",
                    textAlign: "center",
                    fontSize: "14px",
                    color: "var(--text-muted, #64748b)",
                  }}
                >
                  {resendCooldown > 0 ? (
                    <span>
                      Didn't get the code? Resend in <b>{resendCooldown}s</b>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="btn-text-link"
                      style={{
                        fontWeight: "600",
                        color: "#6366f1",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      {resending ? "Sending code..." : "Resend Verification Code"}
                    </button>
                  )}
                </div>

                <div style={{ marginTop: "14px", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setError("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted, #64748b)",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ← Back to registration (Change Email)
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* STEP 1: REGISTRATION DETAILS FORM */
            <>
              <div className="auth-header">
                <div className="auth-brand">
                  <div className="brand-icon-box">
                    <IconKanban size={22} />
                  </div>
                  <span>KANBAN<b>FLOW</b></span>
                </div>
                <h2>Create your account</h2>
                <p>Get started with free real-time workspaces today</p>
              </div>

              {error && (
                <div className="auth-alert error-alert">
                  <span className="alert-icon">⚠️</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span>{error}</span>
                    {error.toLowerCase().includes("already exists") && (
                      <Link
                        to="/login"
                        state={{ email: form.email }}
                        style={{
                          color: "#6366f1",
                          fontWeight: 600,
                          textDecoration: "underline",
                          fontSize: "13px",
                        }}
                      >
                        Click here to Log In with this email →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="modern-form">
                {/* AVATAR SELECTOR SECTION */}
                <div className="avatar-selection-box">
                  <div className="avatar-header">
                    <label className="input-label">Choose your avatar</label>
                    <button
                      type="button"
                      className="random-avatar-btn"
                      onClick={handleRandomize}
                      title="Generate random avatar"
                    >
                      <IconRefresh size={14} />
                      <span>Randomize</span>
                    </button>
                  </div>

                  {/* Live Preview */}
                  <div className="avatar-preview-row">
                    <div className="avatar-main-preview">
                      <Avatar
                        src={form.avatar}
                        name={form.name || "User"}
                        size="xl"
                        className="avatar-ring-glow"
                      />
                      <span className="avatar-status-badge">✓</span>
                    </div>

                    <div className="avatar-tabs">
                      <button
                        type="button"
                        className={`avatar-tab ${avatarMode === "presets" ? "active" : ""}`}
                        onClick={() => setAvatarMode("presets")}
                      >
                        Presets
                      </button>
                      <button
                        type="button"
                        className={`avatar-tab ${avatarMode === "upload" ? "active" : ""}`}
                        onClick={() => setAvatarMode("upload")}
                      >
                        Upload Image
                      </button>
                      <button
                        type="button"
                        className={`avatar-tab ${avatarMode === "url" ? "active" : ""}`}
                        onClick={() => setAvatarMode("url")}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Presets grid */}
                  {avatarMode === "presets" && (
                    <div className="preset-grid">
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          className={`preset-item ${form.avatar === av.url ? "selected" : ""}`}
                          onClick={() => setForm({ ...form, avatar: av.url })}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} />
                          {form.avatar === av.url && (
                            <span className="preset-check">
                              <IconCheck size={10} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mode 2: File Upload */}
                  {avatarMode === "upload" && (
                    <div className="avatar-upload-zone">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                      />
                      <div
                        className="upload-drop-area"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <IconUpload size={28} className="upload-icon" />
                        <div>
                          <b>Click to upload your photo</b>
                          <p>PNG, JPG, WebP up to 5MB (auto-compressed)</p>
                        </div>
                      </div>
                      {uploading && <span className="uploading-text">Compressing image...</span>}
                    </div>
                  )}

                  {/* Mode 3: Direct URL */}
                  {avatarMode === "url" && (
                    <div className="avatar-url-input-wrap">
                      <input
                        type="url"
                        placeholder="https://example.com/my-photo.jpg"
                        value={form.avatar.startsWith("data:") ? "" : form.avatar}
                        onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {/* FULL NAME */}
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div className="input-with-icon">
                    <span className="field-icon">
                      <IconUser size={18} />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="input-field"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-with-icon">
                    <span className="field-icon">
                      <IconMail size={18} />
                    </span>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="input-field"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-with-icon">
                    <span className="field-icon">
                      <IconLock size={18} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
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

                {/* CONFIRM PASSWORD */}
                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div className="input-with-icon">
                    <span className="field-icon">
                      <IconLock size={18} />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                      className="input-field"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <span className="field-hint error-hint">Passwords do not match</span>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <span className="field-hint success-hint">✓ Passwords match</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="submit-button primary-gradient-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Sending verification code to Gmail...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue & Verify Email</span>
                      <span className="btn-arrow">→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Already have an account?{" "}
                  <Link to="/login" className="auth-switch-link">
                    Log In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
