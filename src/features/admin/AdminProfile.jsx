import { useState } from "react";
import { Avatar } from "../../components/common";
import ChangePasswordPanel from "../../components/ChangePasswordPanel";
import { api } from "../../lib/api";

const AdminProfile = ({ user, onLogout, onUserUpdate }) => {
  const adminName = user?.name || "PickPal Admin";
  const adminEmail = user?.email || "admin@pickpal.test";
  const adminDepartment = user?.department || "-";
  const [transfer, setTransfer] = useState({ name: "", email: "", current_password: "" });
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");
  const setTransferField = (key, value) => setTransfer(current => ({ ...current, [key]: value }));

  const submitTransfer = async () => {
    if (!transfer.email || !transfer.current_password || transferSaving) return;

    setTransferSaving(true);
    setTransferMessage("");
    setTransferError("");

    try {
      const result = await api.transferAdmin(transfer);
      onUserUpdate?.(result.user);
      setTransfer({ name: "", email: "", current_password: "" });
      setTransferMessage("Admin account transferred.");
    } catch (error) {
      const firstFieldError = error?.errors ? Object.values(error.errors).flat().find(Boolean) : null;
      setTransferError(firstFieldError || error.message || "Could not transfer admin account.");
    } finally {
      setTransferSaving(false);
    }
  };

  const infoRows = [
    ["Admin ID", user?.id || "admin"],
    ["Full Name", adminName],
    ["Email", adminEmail],
    ["Department", adminDepartment],
    ["Role", "Department Administrator"],
  ];

  return (
    <div className="page-scroll-admin">
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ background: "var(--navy)", padding: "32px 20px 40px", textAlign: "center", position: "relative", overflow: "hidden", borderRadius: 8 }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,102,153,0.12)" }} />
          <Avatar name={adminName} size={80} bg="var(--teal)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white", marginTop: 14 }}>{adminName}</h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 4, overflowWrap: "anywhere" }}>{adminEmail}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span className="badge badge-green">Active</span>
            <span className="badge badge-blue">{adminDepartment} Admin</span>
          </div>
        </div>

        <div style={{ padding: "20px 0" }}>
          <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
            {infoRows.map(([key, value], index, rows) => (
              <div key={key} style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, borderBottom: index < rows.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
                <span style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 500 }}>{key}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginBottom: 14 }}>Security</h4>
            {[
              ["Password", "Protected"],
              ["Session", "Active"],
              ["Access", `${adminDepartment} records only`],
            ].map(([key, value], index, rows) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", gap: 14, borderBottom: index < rows.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
                <span style={{ fontSize: 14, color: "var(--gray-500)" }}>{key}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: value === "Active" ? "var(--green)" : "var(--teal)", textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>

          <ChangePasswordPanel role="admin" />

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginBottom: 14 }}>Transfer Admin Account</h4>
            <div>
              <div style={{ display: "grid", gap: 8 }}>
                <input className="input-field" placeholder="New admin name (optional)" value={transfer.name} onChange={event => setTransferField("name", event.target.value)} />
                <input className="input-field" type="email" placeholder="New admin email" value={transfer.email} onChange={event => setTransferField("email", event.target.value)} />
                <input className="input-field" type="password" placeholder="Current password" value={transfer.current_password} onChange={event => setTransferField("current_password", event.target.value)} />
              </div>
              {transferError && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{transferError}</p>}
              {transferMessage && <p style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>{transferMessage}</p>}
              <button className="btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 12, opacity: transfer.email && transfer.current_password ? 1 : 0.55 }} disabled={!transfer.email || !transfer.current_password || transferSaving} onClick={submitTransfer}>
                {transferSaving ? "Transferring..." : "Transfer by Email"}
              </button>
            </div>
          </div>

          <button className="btn-danger" style={{ width: "100%" }} onClick={onLogout}>Log Out</button>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
