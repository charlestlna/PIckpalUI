import { useState } from "react";
import { api } from "../lib/api";

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Could not change password.";
};

const ChangePasswordPanel = ({ role }) => {
  const [form, setForm] = useState({ current: "", password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const valid = form.current && form.password.length >= 8 && form.password === form.confirm;

  const submit = async () => {
    if (!valid || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        current_password: form.current,
        password: form.password,
        password_confirmation: form.confirm,
      };

      if (role === "admin") {
        await api.changeAdminPassword(payload);
      } else {
        await api.changeVoterPassword(payload);
      }

      setForm({ current: "", password: "", confirm: "" });
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginBottom: 14 }}>Change Password</h4>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="input-field" type="password" placeholder="Current password" value={form.current} onChange={event => set("current", event.target.value)} />
        <input className="input-field" type="password" placeholder="New password" value={form.password} onChange={event => set("password", event.target.value)} />
        <input className="input-field" type="password" placeholder="Confirm new password" value={form.confirm} onChange={event => set("confirm", event.target.value)} />
      </div>
      {form.confirm && form.password !== form.confirm && (
        <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>Passwords do not match.</p>
      )}
      {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{error}</p>}
      {message && <p style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>{message}</p>}
      <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 12, opacity: valid ? 1 : 0.55 }} disabled={!valid || saving} onClick={submit}>
        {saving ? "Saving..." : "Update Password"}
      </button>
    </div>
  );
};

export default ChangePasswordPanel;
