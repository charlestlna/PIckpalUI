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
  const activePosition = positions?.find((position) => position.slug === selectedSlug) || positions?.[0];
  const candidates = activePosition?.candidates || [];
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

      <div style={{ background: "var(--navy)", padding: "20px 20px 0" }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Icon name="arrow" size={12} color="rgba(255,255,255,0.7)" style={{ transform: "rotate(180deg)" }} /> Back
        </button>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Candidates
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "white", marginBottom: 2 }}>
            {election.title}
          </h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{election.department === "SSC" ? "All departments" : `${election.department} Department`} - {election.candidates} candidates</p>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {(positions || []).map((position, i) => (
            <button key={position.id} onClick={() => setSelectedSlug(position.slug)} style={{
              padding: "7px 14px", borderRadius: "var(--radius-full)",
              background: activePosition?.id === position.id ? POS_COLORS[i % POS_COLORS.length] : "rgba(255,255,255,0.1)",
              color: "white", fontWeight: activePosition?.id === position.id ? 700 : 500, fontSize: 12,
              border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
            }}>{position.name}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
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
            <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 16 }}>
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} for <strong>{activePosition?.name}</strong>
            </p>

            {candidates.map((candidate, i) => (
              <button key={candidate.id} className="card fade-up" style={{ padding: 20, marginBottom: 12, width: "100%", border: "1px solid var(--gray-100)", textAlign: "left", cursor: "pointer" }} onClick={() => setPreview(candidate)}>
                <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                  {candidate.photo_url ? (
                    <img src={candidate.photo_url} alt={candidate.name} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--gray-100)" }} />
                  ) : (
                    <Avatar name={candidate.name} size={52} bg={POS_COLORS[colorIndex % POS_COLORS.length]} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--navy)" }}>{candidate.name}</div>
                    <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>{candidate.year_level} - {candidate.section}</div>
                    <span className="badge badge-blue" style={{ marginTop: 6 }}>{activePosition?.name}</span>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${POS_COLORS[colorIndex % POS_COLORS.length]}, ${POS_COLORS[colorIndex % POS_COLORS.length]}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                </div>
                <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                  <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>"{candidate.platform}"</p>
                </div>
              </button>
            ))}
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
