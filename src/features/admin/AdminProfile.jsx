import { Avatar } from "../../components/common";
import ChangePasswordPanel from "../../components/ChangePasswordPanel";

const AdminProfile = ({ user, onLogout }) => {
  const adminName = user?.name || "PickPal Admin";
  const adminEmail = user?.email || "admin@pickpal.test";

  return (
    <div className="page-scroll-admin">
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>My Profile</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Your account details and session information.</p>
        </div>

        <div style={{ background: "var(--navy)", padding: "18px 22px", position: "relative", overflow: "hidden", borderRadius: 8 }}>
          <div style={{ position: "absolute", top: -40, right: -24, width: 130, height: 130, borderRadius: "50%", background: "rgba(13,148,136,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <Avatar name={adminName} size={58} bg="var(--teal)" />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, color: "white" }}>{adminName}</h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 3, overflowWrap: "anywhere" }}>{adminEmail}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <span className="badge badge-green">Active</span>
                <span className="badge badge-blue">Admin</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 360px)", gap: 16, alignItems: "start", marginTop: 16 }}>
          <div>
            <div className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
              {[
                ["Role", "Department Administrator"],
                ["Institution", "Dominican College of Tarlac"],
                ["Admin ID", user?.id || "admin"],
                ["Email", adminEmail],
                ["Last Login", "Current session"],
              ].map(([key, value], index, items) => (
                <div key={key} style={{ padding: "11px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: index < items.length - 1 ? "1px solid var(--gray-100)" : "none", gap: 16 }}>
                  <span style={{ fontSize: 13, color: "var(--gray-500)", fontWeight: 500 }}>{key}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 18, marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginBottom: 10 }}>Security</h4>
              {[
                ["Password", "********"],
                ["Session", "Active"],
              ].map(([key, value], index) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: index === 0 ? "1px solid var(--gray-100)" : "none" }}>
                  <span style={{ fontSize: 14, color: "var(--gray-500)" }}>{key}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: value === "Active" ? "var(--green)" : "var(--teal)" }}>{value}</span>
                </div>
              ))}
            </div>

            <button className="btn-danger" style={{ width: "100%" }} onClick={onLogout}>Sign Out</button>
          </div>

          <ChangePasswordPanel role="admin" />
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
