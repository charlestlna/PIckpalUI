// src/features/admin/AdminDashboard.jsx
import { useMemo } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { useApiResource } from "../../hooks/useApiResource";

const formatElectionTime = (endsAt) => {
  if (!endsAt) return "No end date";

  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return "Ending soon";

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
};

const AdminDashboard = ({ onNavigate }) => {
  const { data, loading, error } = useApiResource(api.dashboardStats, []);

  const stats = useMemo(() => [
    { label: "Active Elections", value: data?.stats?.active_elections ?? 0, icon: "vote", color: "var(--teal)" },
    { label: "Registered Voters", value: data?.stats?.registered_voters ?? 0, icon: "users", color: "#0891B2" },
    { label: "Total Candidates", value: data?.stats?.total_candidates ?? 0, icon: "candidate", color: "#7C3AED" },
    { label: "Turnout", value: `${data?.stats?.turnout ?? 0}%`, icon: "chart", color: "var(--green)" },
  ], [data]);

  const currentElection = data?.current_election;
  const turnout = currentElection?.total_voters > 0
    ? Math.round((currentElection.votes / currentElection.total_voters) * 100)
    : 0;

  return (
    <div className="page-scroll-admin">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)" }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: "var(--gray-500)", marginTop: 6 }}>
            Overview of election activity, voter engagement, and admin alerts.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" onClick={() => onNavigate("elections")}>
            Manage Elections
          </button>
          <button className="btn-primary" onClick={() => onNavigate("elections", { openNewElection: true })}>
            <Icon name="plus" size={16} /> New Election
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Could not load dashboard stats from the Laravel API.
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14, marginBottom: 16 }}>
          Loading dashboard...
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map(stat => (
          <div key={stat.label} className="card" style={{ padding: 22, borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `${stat.color}22`, color: stat.color,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon name={stat.icon} size={18} />
              </div>
              <div style={{ color: "var(--gray-500)", fontSize: 13, fontWeight: 700 }}>{stat.label}</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--navy)" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 16 }}>
            Election Activity
          </h2>
          {currentElection ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)" }}>Current election</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>{currentElection.title}</div>
                </div>
                <span className="badge badge-green">Live</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{formatElectionTime(currentElection.ends_at)}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160, background: "var(--gray-50)", borderRadius: "var(--radius)", padding: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 4 }}>Voter turnout</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--teal)" }}>{turnout}%</div>
                </div>
                <div style={{ flex: 1, minWidth: 160, background: "var(--gray-50)", borderRadius: "var(--radius)", padding: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 4 }}>Candidates</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#7C3AED" }}>{currentElection.candidates}</div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--gray-500)", fontSize: 13, lineHeight: 1.6 }}>
              No election is currently open. Open an election from the Elections panel to begin collecting votes.
            </p>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 16 }}>Alerts</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {(data?.alerts || []).map((message, index) => (
              <div key={index} style={{ background: "var(--gray-50)", borderRadius: "var(--radius)", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Icon name="info" size={14} color="var(--gold)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)" }}>Notice</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>{message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
