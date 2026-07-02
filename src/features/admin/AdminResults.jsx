// src/features/admin/AdminResults.jsx
import { useEffect, useState } from "react";
import { Icon, Avatar } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";

const STATUS_BADGE = { open: "badge-green", upcoming: "badge-blue", closed: "badge-gray" };
const STATUS_LABEL = { open: "Live", upcoming: "Upcoming", closed: "Closed" };
const POS_COLORS = ["var(--teal)", "#0891B2", "#7C3AED", "#D97706", "#DC2626"];

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors ? Object.values(error.errors).flat().find(Boolean) : null;
  return firstFieldError || error?.message || "Something went wrong.";
};

const ElectionPicker = ({ elections, loading, error, onSelect }) => (
  <div className="page-scroll-admin">
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Election Results</h1>
      <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Select an election to view and publish results.</p>
    </div>
    {error && <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
    {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading elections...</div>}
    {!loading && !error && elections.length === 0 && (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <Icon name="trophy" size={42} color="var(--gray-300)" />
        <p style={{ fontSize: 15, color: "var(--gray-400)", marginTop: 16 }}>No results yet. Results will appear after an election receives votes.</p>
      </div>
    )}
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!loading && elections.map(election => {
        const turnout = election.totalVoters > 0 ? Math.round((election.voted / election.totalVoters) * 100) : 0;
        return (
          <button key={election.id} onClick={() => onSelect(election)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "white", border: "1px solid var(--gray-100)", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="trophy" size={22} color="var(--gold)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>{election.title}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={`badge ${STATUS_BADGE[election.status] || "badge-gray"}`} style={{ fontSize: 11 }}>{STATUS_LABEL[election.status] || election.status}</span>
                  {election.results_published && <span className="badge badge-green" style={{ fontSize: 11 }}>Published</span>}
                  <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{election.dept} - {election.voted}/{election.totalVoters} votes - {turnout}% turnout</span>
                </div>
                <div style={{ width: 200, height: 5, background: "var(--gray-100)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${turnout}%`, background: "linear-gradient(90deg, var(--teal), var(--teal-light))", borderRadius: 99 }} />
                </div>
              </div>
            </div>
            <Icon name="arrow" size={16} color="var(--teal)" />
          </button>
        );
      })}
    </div>
  </div>
);

const ResultsViewer = ({ election, onBack }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = "var(--navy)") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const loadResults = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminResults(election.id);
      setResult(data);
      setExpanded(data.positions?.[0]?.name || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [election.id]);

  const handlePublish = async (published) => {
    setPublishing(true);
    setError("");
    try {
      await api.updateResultsPublishStatus(election.id, published);
      setResult(current => ({ ...current, published }));
      showToast(published ? "Results published." : "Results unpublished.", published ? "var(--teal)" : "var(--gray-500)");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const turnout = election.totalVoters > 0 ? Math.round((election.voted / election.totalVoters) * 100) : 0;

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <button className="btn-outline" onClick={onBack} style={{ padding: "7px 12px", fontSize: 12, marginBottom: 10 }}><Icon name="back" size={13} /> Back to Elections</button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--navy)", marginBottom: 4 }}>{election.title}</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <span className={`badge ${STATUS_BADGE[election.status] || "badge-gray"}`} style={{ fontSize: 11 }}>{STATUS_LABEL[election.status] || election.status}</span>
            {result?.published && <span className="badge badge-green" style={{ fontSize: 11 }}>Results Published</span>}
          </div>
        </div>
        <button className={result?.published ? "btn-outline" : "btn-primary"} onClick={() => handlePublish(!result?.published)} disabled={publishing || loading || !result || election.voted === 0}>
          {publishing ? "Saving..." : result?.published ? "Unpublish" : <><Icon name="check" size={15} /> Publish Results</>}
        </button>
      </div>

      {error && <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading results...</div>}

      {!loading && result && election.voted === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Icon name="trophy" size={42} color="var(--gray-300)" />
          <p style={{ fontSize: 15, color: "var(--gray-400)", marginTop: 16 }}>No results yet. Vote totals will appear after ballots are submitted.</p>
        </div>
      )}

      {!loading && result && election.voted > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              ["Total Voters", election.totalVoters],
              ["Votes Cast", election.voted],
              ["Turnout", `${turnout}%`],
              ["Positions", result.positions.length],
            ].map(([label, value]) => (
              <div key={label} className="stat-card" style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.positions.map((position, index) => (
              <div key={position.id} className="card" style={{ overflow: "hidden" }}>
                <div onClick={() => setExpanded(expanded === position.name ? null : position.name)} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, borderBottom: expanded === position.name ? "1px solid var(--gray-100)" : "none" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: POS_COLORS[index % POS_COLORS.length], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 2 }}>{position.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="trophy" size={14} color="var(--gold)" />
                      {position.winner || "No winner yet"}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{position.total_votes} votes</span>
                </div>
                {expanded === position.name && (
                  <div style={{ padding: "18px 22px" }}>
                    {position.candidates.map((candidate, candidateIndex) => (
                      <div key={candidate.id} style={{ marginBottom: candidateIndex < position.candidates.length - 1 ? 16 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <Avatar name={candidate.name} size={30} bg={candidateIndex === 0 ? POS_COLORS[index % POS_COLORS.length] : "var(--gray-300)"} />
                          <div style={{ flex: 1, fontSize: 13, fontWeight: candidateIndex === 0 ? 700 : 500, color: "var(--navy)" }}>{candidate.name}</div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: candidateIndex === 0 ? POS_COLORS[index % POS_COLORS.length] : "var(--gray-400)" }}>{candidate.pct}%</div>
                            <div style={{ fontSize: 11, color: "var(--gray-400)" }}>{candidate.votes} votes</div>
                          </div>
                        </div>
                        <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${candidate.pct}%`, background: candidateIndex === 0 ? POS_COLORS[index % POS_COLORS.length] : "var(--gray-200)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdminResults = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedElection, setSelectedElection] = useState(null);

  useEffect(() => {
    api.adminElections()
      .then(data => setElections(data.map(normalizeElection)))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (selectedElection) return <ResultsViewer election={selectedElection} onBack={() => setSelectedElection(null)} />;
  return <ElectionPicker elections={elections} loading={loading} error={error} onSelect={setSelectedElection} />;
};

export default AdminResults;
