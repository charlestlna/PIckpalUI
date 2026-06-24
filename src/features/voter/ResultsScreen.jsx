import { useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";
import { useApiResource } from "../../hooks/useApiResource";

const STATUS_CFG = {
  open:   { label: "Live", badge: "badge-green", dot: true },
  closed: { label: "Closed", badge: "badge-gray", dot: false },
  upcoming: { label: "Upcoming", badge: "badge-blue", dot: false },
};

const ElectionPicker = ({ onSelect }) => {
  const { data, loading, error } = useApiResource(api.elections, []);
  const elections = (data || [])
    .map(normalizeElection)
    .filter((election) => election.status !== "upcoming" && election.official);

  return (
    <div className="page-scroll">
      <div style={{ background: "var(--navy)", padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Icon name="trophy" size={20} color="var(--gold)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>Results</h2>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Select an election to view its results.</p>
      </div>
      <div style={{ padding: "16px" }}>
        {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading results...</div>}
        {error && <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>Could not load elections from the Laravel API.</div>}
        {!loading && !error && elections.length === 0 && (
          <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
            No published results are available yet.
          </div>
        )}
        {!loading && !error && elections.map(el => {
          const cfg = STATUS_CFG[el.status] || STATUS_CFG.closed;
          const turnout = el.totalVoters > 0 ? Math.round((el.voted / el.totalVoters) * 100) : 0;
          return (
            <button key={el.id} onClick={() => onSelect(el)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "white", border: "1px solid var(--gray-100)", borderRadius: "var(--radius)", padding: 0, marginBottom: 12, cursor: "pointer", overflow: "hidden", boxShadow: "var(--shadow-sm)", transition: "all 0.18s" }}
            >
              <div style={{ background: "var(--navy)", padding: "14px 18px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                      {cfg.dot && <div className="live-dot" style={{ width: 7, height: 7 }} />}
                      <span className={`badge ${cfg.badge}`} style={{ fontSize: 10 }}>{cfg.label}</span>
                      {el.official && <span className="badge badge-gold" style={{ fontSize: 10 }}>Official</span>}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "white", lineHeight: 1.3 }}>{el.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{el.department === "SSC" ? "All departments" : `${el.department} Department`}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{turnout}%</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>turnout</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 18px" }}>
                <div style={{ height: 5, background: "var(--gray-100)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${turnout}%`, background: "linear-gradient(90deg,var(--teal),var(--teal-light))", borderRadius: 99 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--gray-500)" }}>{el.voted} of {el.totalVoters} voters</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--teal)", display: "flex", alignItems: "center", gap: 4 }}>
                    View Results <Icon name="arrow" size={12} color="var(--teal)" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ResultsViewer = ({ election, onBack }) => {
  const [expanded, setExpanded] = useState(null);
  const { data, loading, error } = useApiResource(() => api.results(election.id), [election.id]);
  const results = data?.positions || [];
  const turnout = election.totalVoters > 0 ? Math.round((election.voted / election.totalVoters) * 100) : 0;
  const POS_COLORS = ["var(--teal)", "#0891B2", "#7C3AED", "#D97706", "#DC2626"];

  return (
    <div className="page-scroll">
      <div style={{ background: "var(--navy)", padding: "20px 20px 18px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Icon name="trophy" size={18} color="var(--gold)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "white" }}>{election.title}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {election.status === "open" && <><div className="live-dot" style={{ width: 7, height: 7 }} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Live results from Laravel</span></>}
          {data?.published && <span className="badge badge-gold" style={{ fontSize: 10 }}>Official Results</span>}
        </div>
      </div>

      <div style={{ padding: "14px 16px 20px" }}>
        <div className="card" style={{ padding: "14px 16px", marginBottom: 14, display: "flex", justifyContent: "space-around" }}>
          {[[election.totalVoters, "Total Voters"], [election.voted, "Votes Cast"], [`${turnout}%`, "Turnout"]].map(([v, k], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)" }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 500 }}>{k}</div>
            </div>
          ))}
        </div>

        {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading vote totals...</div>}
        {error && <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>Could not load results from the Laravel API.</div>}

        {!loading && !error && results.map((item, pi) => (
          <div key={item.id} className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => setExpanded(expanded === item.slug ? null : item.slug)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: POS_COLORS[pi % POS_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{item.name}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="trophy" size={13} color="var(--gold)" />{item.winner || "No votes yet"}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--teal)" }}>{expanded === item.slug ? "Hide" : "View"}</span>
            </div>
            {expanded === item.slug && (
              <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--gray-100)" }}>
                <div style={{ height: 10 }} />
                {item.candidates.map((candidate, i) => (
                  <div key={candidate.id} className="chart-bar-wrap" style={{ marginBottom: 10 }}>
                    <div className="chart-label" style={{ display: "flex", alignItems: "center", gap: 5, width: 100 }}>
                      {i === 0 && <Icon name="star" size={12} color="var(--gold)" />}
                      <span style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "var(--navy)" : "var(--gray-600)" }}>{candidate.name.split(" ")[0]}</span>
                    </div>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{ width: `${candidate.pct}%`, background: i === 0 ? "linear-gradient(90deg,var(--gold),var(--gold-light))" : "linear-gradient(90deg,var(--teal),var(--teal-light))" }} />
                    </div>
                    <div className="chart-val" style={{ fontSize: 12 }}>{candidate.pct}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultsScreen = () => {
  const [selectedElection, setSelected] = useState(null);
  if (selectedElection) return <ResultsViewer election={selectedElection} onBack={() => setSelected(null)} />;
  return <ElectionPicker onSelect={setSelected} />;
};

export default ResultsScreen;
