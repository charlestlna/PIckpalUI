// src/features/auth/LoginScreen.jsx
import { useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

// ── Forgot Password view ──────────────────────────────────────────────────────
const ForgotPassword = ({ role, onBack }) => {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const validEmail = email.trim().includes("@");
  const validReset = token.trim() && password.length >= 8 && password === confirm;

  const getErrorMessage = (err) => {
    const firstFieldError = err?.errors
      ? Object.values(err.errors).flat().find(Boolean)
      : null;

    return firstFieldError || err?.message || "Could not reset password.";
  };

  const handleRequest = async () => {
    if (!validEmail || loading) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await api.requestPasswordReset({ role, email: email.trim() });
      setToken("");
      setMessage(result.message || "Password reset code sent to your email.");
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!validReset || loading) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await api.resetPassword({
        role,
        email: email.trim(),
        token: token.trim(),
        password,
        password_confirmation: confirm,
      });
      setMessage(result.message);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div className="card" style={{ padding: "28px 24px" }}>
        {step === "request" ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,102,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock" size={18} color="var(--teal)" />
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)" }}>Forgot Password</h2>
              <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>Reset your {role} account password.</p>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Email Address</label>
            <input className="input-field" type="email" placeholder="e.g. juan@dct.edu.ph"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRequest()} />
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 6 }}>
              Enter the email you used when registering your account.
            </p>
          </div>

          {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", opacity: validEmail ? 1 : 0.5 }}
            onClick={handleRequest} disabled={!validEmail || loading}>
            {loading
              ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
              : <><Icon name="arrow" size={15} /> Get Reset Code</>}
          </button>

          <button onClick={onBack} style={{ display: "block", width: "100%", textAlign: "center", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--gray-400)", marginTop: 14 }}>
            Back to Sign In
          </button>
        </> : step === "reset" ? <>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 6 }}>Set New Password</h2>
            <p style={{ fontSize: 13, color: "var(--gray-500)", lineHeight: 1.5, marginBottom: 16 }}>{message}</p>
            <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
              <input className="input-field" placeholder="Reset code" value={token} onChange={e => setToken(e.target.value)} />
              <input className="input-field" type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
              <input className="input-field" type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            {confirm && password !== confirm && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>Passwords do not match.</p>}
            {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center", opacity: validReset ? 1 : 0.5 }} onClick={handleReset} disabled={!validReset || loading}>
              {loading ? "Saving..." : "Reset Password"}
            </button>
            <button onClick={onBack} style={{ display: "block", width: "100%", textAlign: "center", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--gray-400)", marginTop: 14 }}>
              Back to Sign In
            </button>
          </div>
        </> : <>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check" size={30} color="var(--green)" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 8 }}>Password Updated</h2>
            <p style={{ fontSize: 14, color: "var(--gray-500)", lineHeight: 1.6, marginBottom: 8 }}>
              {message}
            </p>
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={onBack}>
              Back to Sign In
            </button>
          </div>
        </>}
      </div>
    </div>
  );
};

// ── Login view ────────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin, onRegister }) => {
  const [id, setId]             = useState("");
  const [pass, setPass]         = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [role, setRole]         = useState("voter");
  const [showForgot, setForgot] = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!id || !pass) return;
    setLoading(true);
    setError("");

    if (role === "admin") {
      try {
        const result = await api.adminLogin({
          email: id.trim(),
          password: pass,
        });

        onLogin("admin", result.user, result.token);
      } catch (err) {
        const firstFieldError = err.errors
          ? Object.values(err.errors).flat().find(Boolean)
          : null;

        const networkError = err instanceof TypeError;
        setError(
          firstFieldError
          || (networkError ? "Could not reach the Laravel API. Make sure Herd is running and pickpal.test is linked." : err.message)
          || "Could not sign in as admin.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const result = await api.voterLogin({
        student_number: id.trim(),
        password: pass,
      });

      onLogin("voter", {
        role: "voter",
        studentNumber: result.user.student_number,
        voter: result.user,
      }, result.token);
    } catch (err) {
      const firstFieldError = err.errors
        ? Object.values(err.errors).flat().find(Boolean)
        : null;

      const networkError = err instanceof TypeError;
      setError(
        firstFieldError
        || (networkError ? "Could not reach the Laravel API. Make sure Herd is running and pickpal.test is linked." : err.message)
        || "Could not sign in as voter.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,102,153,0.18) 0%,transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -80, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,0.12) 0%,transparent 70%)" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo */}
        <div className="fade-up" style={{ textAlign: "center", marginBottom: showForgot ? 28 : 36, width: "100%" }}>
          <div style={{ width: 66, height: 66, background: "linear-gradient(135deg,var(--teal),var(--teal-light))", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 32px rgba(255,102,153,0.4)" }}>
            <Icon name="vote" size={32} color="white" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "white", letterSpacing: "-0.01em" }}>PickPal</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 3 }}>Dominican College of Tarlac</p>
        </div>

        {/* Forgot password */}
        {showForgot ? (
          <div className="fade-up" style={{ width: "100%" }}>
            <ForgotPassword role={role} onBack={() => setForgot(false)} />
          </div>
        ) : (<>
          {/* Role toggle */}
          <div className="fade-up-1" style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: "var(--radius)", padding: 4, marginBottom: 20, width: "100%" }}>
            {["voter", "admin"].map(r => (
              <button key={r} onClick={() => { setRole(r); setError(""); }} style={{ flex: 1, padding: "10px", borderRadius: "calc(var(--radius) - 4px)", background: role === r ? "var(--teal)" : "transparent", color: role === r ? "white" : "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
                {r === "voter" ? "Voter" : "Admin"}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div className="fade-up-2 card" style={{ padding: "26px 24px", width: "100%" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, color: "var(--navy)", marginBottom: 4 }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 22 }}>Sign in as <strong style={{ color: "var(--teal)" }}>{role}</strong> to continue</p>

            <div style={{ marginBottom: 14 }}>
              <label className="label">{role === "admin" ? "Admin Email" : "Student Number"}</label>
              <input
                className="input-field"
                type={role === "admin" ? "email" : "text"}
                placeholder={role === "admin" ? "Enter your admin email" : "Enter your student number"}
                value={id}
                name={role === "admin" ? "pickpal-admin-email" : "pickpal-student-number"}
                autoComplete="off"
                inputMode={role === "admin" ? undefined : "numeric"}
                maxLength={role === "admin" ? undefined : 9}
                onChange={e => {
                  setId(role === "admin" ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 9));
                  setError("");
                }}
              />
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <button onClick={() => setForgot(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input className="input-field" type={showPass ? "text" : "password"} placeholder="Enter your password"
                  name="pickpal-login-password"
                  autoComplete="new-password"
                  value={pass} onChange={e => { setPass(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ paddingRight: 46 }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)" }}>
                  <Icon name={showPass ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
            </div>

            {error ? (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "var(--red)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                {error}
              </div>
            ) : (
              <div style={{ marginBottom: 20 }} />
            )}

            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogin} disabled={loading}>
              {loading
                ? <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                : <>Sign In <Icon name="arrow" size={16} /></>}
            </button>

            {role === "voter" && (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--gray-400)", marginTop: 16 }}>
                New student?{" "}
                <button onClick={onRegister} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: 13, fontWeight: 600 }}>Register here</button>
              </p>
            )}

          </div>

          <p className="fade-up-3" style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 18 }}>DCT Capstone Project 2025-2026</p>
        </>)}
      </div>
    </div>
  );
};
export default LoginScreen;
