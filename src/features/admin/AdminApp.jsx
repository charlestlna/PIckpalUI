// src/features/admin/AdminApp.jsx
import { useState } from "react";
import { Icon, Avatar } from "../../components/common";
import { ADMIN_NAV }    from "./adminNav";
import AdminDashboard   from "./AdminDashboard";
import AdminElections   from "./AdminElections";
import AdminVoters      from "./AdminVoters";
import AdminCandidates  from "./AdminCandidates";
import AdminResults     from "./AdminResults";
import AdminAnalytics   from "./AdminAnalytics";
import AdminSurvey      from "./AdminSurvey";
import AdminAudit       from "./AdminAudit";
import AdminProfile     from "./AdminProfile";

const AdminApp = ({ user, onLogout }) => {
  const [tab, setTab] = useState("dashboard");
  const [openNewElection, setOpenNewElection] = useState(false);
  const adminName = user?.name || "PickPal Admin";
  const adminEmail = user?.email || "admin@pickpal.test";

  const navigate = (target, options = {}) => {
    setTab(target);
    setOpenNewElection(Boolean(options.openNewElection));
  };

  const renderContent = () => {
    switch (tab) {
      case "dashboard":  return <AdminDashboard  onNavigate={navigate} />;
      case "elections":  return <AdminElections  onNavigate={navigate} openNewElection={openNewElection} onNewElectionHandled={() => setOpenNewElection(false)} />;
      case "voters":     return <AdminVoters />;
      case "candidates": return <AdminCandidates />;
      case "results":    return <AdminResults />;
      case "analytics":  return <AdminAnalytics />;
      case "survey":     return <AdminSurvey />;
      case "audit":      return <AdminAudit />;
      case "profile":    return <AdminProfile user={user} onLogout={onLogout} />;
      default:           return null;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--gray-100)" }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 240, background: "var(--navy)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="vote" size={18} color="white" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "white" }}>PickPal</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Admin Panel</div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: "12px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", padding: "6px 4px 8px", textTransform: "uppercase" }}>Management</div>
          {ADMIN_NAV.map(item => (
            <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setTab("profile")}
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "none", border: "none", cursor: "pointer", width: "100%", padding: "6px 4px", borderRadius: "var(--radius-sm)", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <Avatar name={adminName} size={34} bg="var(--teal)" />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{adminName}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{adminEmail}</div>
            </div>
            <Icon name="arrow" size={14} color="rgba(255,255,255,0.25)" />
          </button>
          <button className="nav-item" onClick={onLogout} style={{ color: "rgba(239,68,68,0.8)" }}>
            <span className="nav-icon"><Icon name="logout" size={18} /></span>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ background: "white", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--gray-100)", flexShrink: 0 }}>
          <div style={{ fontSize: 14, color: "var(--gray-500)" }}>
            {ADMIN_NAV.find(n => n.id === tab)?.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge badge-green"><span className="live-dot" style={{ width: 6, height: 6 }} /> Election Live</span>
            <span style={{ fontSize: 13, color: "var(--gray-400)" }}>Dominican College of Tarlac</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
