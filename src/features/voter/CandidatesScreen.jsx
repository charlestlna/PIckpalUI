import { useState } from "react";
import { Avatar, Icon } from "../../components/common";
import { api } from "../../lib/api";
import { useApiResource } from "../../hooks/useApiResource";
import ElectionPicker from "./ElectionPicker";

const POS_COLORS = ["#FF6699", "#0891B2", "#7C3AED", "#D97706", "#DC2626"];

const CandidateList = ({ election, onBack }) => {
  const { data: positions, loading, error } = useApiResource(() => api.candidates(election.id), [election.id]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [preview, setPreview] = useState(null);
  const activePosition = positions?.find((position) => position.slug === selectedSlug);
  const colorIndex = Math.max(0, positions?.findIndex((position) => position.id === activePosition?.id) ?? 0);

  return (
    <div className="page-scroll">
      {preview && (
        <div className="overlay-centered" onClick={event => event.target === event.currentTarget && setPreview(null)}>
          <div className="modal-centered" style={{ maxWidth: 420, padding: 0, overflow: "hidden" }}>
            <div style={{ background: "var(--navy)", padding: "24px 22px", textAlign: "center" }}>
              {preview.photo_url ? (
                <img src={preview.photo_url} alt={preview.name} style={{ width: 118, height: 118, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.22)", marginBottom: 14 }} />
              ) : (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <Avatar name={preview.name} size={118} bg={POS_COLORS[colorIndex % POS_COLORS.length]} />
                </div>
              )}
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white", marginBottom: 4 }}>{preview.name}</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.58)", margin: 0 }}>{[preview.year_level, preview.section].filter(Boolean).join(" - ") || "Candidate"}</p>
            </div>
            <div style={{ padding: 22 }}>
              <span className="badge badge-blue" style={{ marginBottom: 12 }}>{activePosition?.name}</span>
              <p style={{ fontSize: 14, color: "var(--gray-600)", lineHeight: 1.7, marginTop: 12, whiteSpace: "pre-wrap" }}>
                {preview.platform || "No platform statement provided."}
              </p>
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 18 }} onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="voter-header" style={{ background: "var(--navy)", padding: "20px" }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Icon name="back" size={12} color="rgba(255,255,255,0.7)" /> Back
        </button>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}><Icon name="candidate" size={20} color="var(--teal-light)" /><h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>Candidates</h2></div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>{election.title}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{election.department === "SSC" ? "All departments" : `${election.department} Department`} - {election.candidates} candidates</p>
        </div>

      </div>

      <div style={{ padding: "20px 16px", width: "100%", maxWidth: 680, margin: "0 auto" }}>
        {loading && (
          <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
            Loading candidates...
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>
            Could not load candidates from the Laravel API.
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ marginBottom: 20 }}>
              <p className="label">Positions</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(positions || []).map((position, index) => {
                  const selected = activePosition?.id === position.id;
                  return (
                    <div key={position.id}>
                      <button onClick={() => setSelectedSlug(selected ? null : position.slug)} style={{ width: "100%", minHeight: 48, padding: "11px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${selected ? POS_COLORS[index % POS_COLORS.length] : "var(--gray-200)"}`, background: selected ? "rgba(255,102,153,0.07)" : "white", color: selected ? "var(--teal)" : "var(--navy)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", fontSize: 14, fontWeight: selected ? 700 : 600 }}>
                        <span>{position.name}</span>
                        <span style={{ minWidth: 28, padding: "2px 7px", borderRadius: 99, background: selected ? "var(--teal)" : "var(--gray-100)", color: selected ? "white" : "var(--gray-500)", textAlign: "center", fontSize: 11, fontWeight: 700 }}>{position.candidates.length}</span>
                      </button>
                      {selected && (
                        <div style={{ padding: "10px 0 4px 12px", borderLeft: "2px solid rgba(255,102,153,0.22)", marginLeft: 12 }}>
                          {position.candidates.length === 0 && <p style={{ padding: 14, color: "var(--gray-400)", fontSize: 13 }}>No candidates for this position yet.</p>}
                          {position.candidates.map((candidate, candidateIndex) => (
                            <button key={candidate.id} className="card fade-up" style={{ padding: 16, marginBottom: 10, width: "100%", border: "1px solid var(--gray-100)", textAlign: "left", cursor: "pointer" }} onClick={() => setPreview(candidate)}>
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                {candidate.photo_url ? <img src={candidate.photo_url} alt={candidate.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <Avatar name={candidate.name} size={48} bg={POS_COLORS[index % POS_COLORS.length]} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--navy)", overflowWrap: "anywhere" }}>{candidate.name}</div>
                                  <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>{candidate.year_level} - {candidate.section}</div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-300)" }}>#{candidateIndex + 1}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CandidatesScreen = () => {
  const [selectedElection, setSelected] = useState(null);

  if (selectedElection) {
    return <CandidateList election={selectedElection} onBack={() => setSelected(null)} />;
  }

  return <ElectionPicker mode="candidates" onSelect={setSelected} />;
};

export default CandidatesScreen;
