// src/features/admin/AdminCandidates.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon, Avatar } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";

const POS_COLORS = ["#FF6699", "#0891B2", "#7C3AED", "#D97706", "#DC2626"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const BLANK_FORM = { name: "", year_level: "1st Year", section: "", platform: "", photo_url: "" };

const STATUS_BADGE = { open: "badge-green", upcoming: "badge-blue", closed: "badge-gray" };
const STATUS_LABEL = { open: "Live", upcoming: "Upcoming", closed: "Closed" };

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Something went wrong.";
};

const CandidateForm = ({ position, initial, saving, error, onSave, onCancel }) => {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_FORM });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const valid = form.name.trim() && form.section.trim();
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const handlePhoto = (file) => {
    setPhotoError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }

    if (file.size > 700 * 1024) {
      setPhotoError("Please choose an image smaller than 700 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingPhoto(true);

      try {
        const result = await api.uploadImage({ type: "candidate", image_data: reader.result });
        set("photo_url", result.url);
      } catch (err) {
        setPhotoError(getErrorMessage(err));
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.onerror = () => setPhotoError("Could not read the selected image.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="overlay-centered" onClick={event => event.target === event.currentTarget && onCancel()}>
      <div className="modal-centered">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)" }}>
              {initial ? "Edit Candidate" : "Add Candidate"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>Position: <strong>{position.name}</strong></p>
          </div>
          <button onClick={onCancel} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--gray-500)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Full Name</label>
          <input className="input-field" placeholder="Candidate full name" value={form.name} onChange={event => set("name", event.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Candidate Photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {form.photo_url ? (
              <img src={form.photo_url} alt={form.name || "Candidate"} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gray-100)" }} />
            ) : (
              <Avatar name={form.name || "Candidate"} size={64} bg="var(--gray-300)" />
            )}
            <div style={{ flex: 1 }}>
              <input className="input-field" type="file" accept="image/*" onChange={event => handlePhoto(event.target.files?.[0])} disabled={uploadingPhoto} />
              {uploadingPhoto && <p style={{ color: "var(--gray-500)", fontSize: 12, marginTop: 6 }}>Uploading photo...</p>}
              {photoError && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{photoError}</p>}
              {form.photo_url && (
                <button type="button" onClick={() => set("photo_url", "")} style={{ marginTop: 6, background: "none", border: "none", color: "var(--red)", fontSize: 12, cursor: "pointer", padding: 0 }}>
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label className="label">Year Level</label>
            <select className="input-field" value={form.year_level || "1st Year"} onChange={event => set("year_level", event.target.value)}>
              {YEARS.map(year => <option key={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <input className="input-field" placeholder="e.g. BSCS-4A" value={form.section || ""} onChange={event => set("section", event.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Platform Statement</label>
          <textarea className="input-field" rows={3} placeholder="Candidate platform or advocacy..." value={form.platform || ""} onChange={event => set("platform", event.target.value)} style={{ resize: "vertical" }} />
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "var(--red)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, justifyContent: "center", opacity: valid && !uploadingPhoto ? 1 : 0.5 }} onClick={() => valid && onSave(form)} disabled={!valid || saving || uploadingPhoto}>
            {saving
              ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
              : initial ? "Save Changes" : <><Icon name="plus" size={14} /> Add Candidate</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const ElectionPicker = ({ elections, loading, error, onSelect, onReload }) => (
  <div className="page-scroll-admin">
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Candidates</h1>
      <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Select one of your department elections to add, edit, or remove candidates.</p>
    </div>

    {error && (
      <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
        {error}
        <button className="btn-outline" style={{ marginLeft: 12, padding: "6px 12px", fontSize: 12 }} onClick={onReload}>Retry</button>
      </div>
    )}

    {loading && (
      <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
        Loading elections...
      </div>
    )}

    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!loading && elections.map(election => (
        <button key={election.id} onClick={() => onSelect(election)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "white", border: "1px solid var(--gray-100)", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", transition: "all 0.18s", boxShadow: "var(--shadow-sm)" }}
          onMouseEnter={event => { event.currentTarget.style.borderColor = "var(--teal)"; event.currentTarget.style.boxShadow = "0 4px 16px rgba(255,102,153,0.12)"; event.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={event => { event.currentTarget.style.borderColor = "var(--gray-100)"; event.currentTarget.style.boxShadow = "var(--shadow-sm)"; event.currentTarget.style.transform = ""; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "rgba(255,102,153,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="vote" size={22} color="var(--teal)" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>{election.title}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className={`badge ${STATUS_BADGE[election.status] || "badge-gray"}`} style={{ fontSize: 11 }}>{STATUS_LABEL[election.status] || election.status}</span>
                {election.archived && <span className="badge badge-gray" style={{ fontSize: 10 }}>Archived</span>}
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>- {election.candidates} candidates</span>
              </div>
            </div>
          </div>
          <Icon name="arrow" size={18} color="var(--gray-300)" />
        </button>
      ))}
    </div>
  </div>
);

export const CandidateManager = ({ election, onBack, backLabel = "Back to Elections" }) => {
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [toast, setToast] = useState(null);

  const selectedPosition = positions.find(position => position.id === selectedPositionId) || positions[0];
  const list = selectedPosition?.candidates || [];
  const positionIndex = Math.max(0, positions.findIndex(position => position.id === selectedPosition?.id));
  const totalCandidates = useMemo(() => positions.reduce((total, position) => total + position.candidates.length, 0), [positions]);

  const showToast = (msg, color = "var(--navy)") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const loadCandidates = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.adminCandidates(election.id);
      setPositions(data);
      setSelectedPositionId(current => current || data[0]?.id || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [election.id]);

  const updateCandidateInState = (candidate) => {
    setPositions(current => current.map(position => (
      position.id === selectedPosition.id
        ? { ...position, candidates: position.candidates.map(item => item.id === candidate.id ? candidate : item) }
        : position
    )));
  };

  const addCandidateInState = (candidate) => {
    setPositions(current => current.map(position => (
      position.id === selectedPosition.id
        ? { ...position, candidates: [...position.candidates, candidate] }
        : position
    )));
  };

  const removeCandidateInState = (candidateId) => {
    setPositions(current => current.map(position => (
      position.id === selectedPosition.id
        ? { ...position, candidates: position.candidates.filter(candidate => candidate.id !== candidateId) }
        : position
    )));
  };

  const handleSave = async (form) => {
    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name,
      year_level: form.year_level,
      section: form.section,
      platform: form.platform,
      photo_url: form.photo_url || null,
    };

    try {
      if (editingCandidate) {
        const updated = await api.updateCandidate(election.id, editingCandidate.id, payload);
        updateCandidateInState(updated);
        showToast("Candidate updated.", "var(--teal)");
      } else {
        const created = await api.createCandidate(election.id, {
          ...payload,
          position_id: selectedPosition.id,
        });
        addCandidateInState(created);
        showToast("Candidate added.", "var(--teal)");
      }

      setShowForm(false);
      setEditingCandidate(null);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (candidate) => {
    setError("");

    try {
      await api.deleteCandidate(election.id, candidate.id);
      removeCandidateInState(candidate.id);
      showToast("Candidate removed.", "var(--red)");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openAdd = () => {
    setEditingCandidate(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (candidate) => {
    setEditingCandidate(candidate);
    setFormError("");
    setShowForm(true);
  };

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
      {showForm && selectedPosition && (
        <CandidateForm
          position={selectedPosition}
          initial={editingCandidate}
          saving={saving}
          error={formError}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingCandidate(null); }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: 13, fontWeight: 600, marginBottom: 8, padding: 0 }}>
            {backLabel}
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--navy)", marginBottom: 4, lineHeight: 1.2 }}>{election.title}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${STATUS_BADGE[election.status] || "badge-gray"}`} style={{ fontSize: 11 }}>{STATUS_LABEL[election.status] || election.status}</span>
            <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{totalCandidates} total candidates</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
          Loading candidates...
        </div>
      )}

      {!loading && positions.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="candidate" size={38} color="var(--gray-300)" />
          <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14 }}>This election has no positions yet.</p>
        </div>
      )}

      {!loading && positions.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {positions.map((position, index) => {
              const selected = selectedPosition?.id === position.id;
              return (
                <button key={position.id} onClick={() => setSelectedPositionId(position.id)} style={{
                  padding: "8px 16px", borderRadius: "var(--radius-full)", border: "none", cursor: "pointer",
                  background: selected ? POS_COLORS[index % POS_COLORS.length] : "var(--gray-100)",
                  color: selected ? "white" : "var(--gray-600)",
                  fontWeight: selected ? 700 : 500, fontSize: 13, transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {position.name}
                  <span style={{ background: selected ? "rgba(255,255,255,0.25)" : "var(--gray-200)", color: selected ? "white" : "var(--gray-500)", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                    {position.candidates.length}
                  </span>
                </button>
              );
            })}
          </div>

          {list.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <button className="btn-primary" style={{ padding: "9px 16px", fontSize: 13 }} onClick={openAdd} disabled={!selectedPosition}>
                <Icon name="plus" size={15} /> Add Candidate
              </button>
            </div>
          )}

          {list.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <Icon name="candidate" size={38} color="var(--gray-300)" />
              <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14, marginBottom: 20 }}>
                No candidates for <strong>{selectedPosition.name}</strong> yet.
              </p>
              <button className="btn-primary" onClick={openAdd}>
                <Icon name="plus" size={15} /> Add First Candidate
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {list.map((candidate, index) => (
              <div key={candidate.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                  {candidate.photo_url ? (
                    <img src={candidate.photo_url} alt={candidate.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--gray-100)" }} />
                  ) : (
                    <Avatar name={candidate.name} size={48} bg={POS_COLORS[positionIndex % POS_COLORS.length]} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--navy)", lineHeight: 1.2 }}>{candidate.name}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>{candidate.year_level || "Year TBA"} - {candidate.section || "Section TBA"}</div>
                    <span className="badge badge-blue" style={{ marginTop: 6, fontSize: 10 }}>{selectedPosition.name}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-300)" }}>#{index + 1}</div>
                </div>
                {candidate.platform && (
                  <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>"{candidate.platform}"</p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-outline" style={{ flex: 1, padding: "8px", fontSize: 12, justifyContent: "center" }} onClick={() => openEdit(candidate)}>
                    Edit
                  </button>
                  <button style={{ flex: 1, padding: "8px", fontSize: 12, borderRadius: "var(--radius-full)", border: "1.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "var(--red)", cursor: "pointer", fontWeight: 600 }} onClick={() => handleRemove(candidate)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdminCandidates = ({ initialElection, onInitialElectionHandled }) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedElection, setSelectedElection] = useState(null);

  const loadElections = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.adminElections({ include_archived: true });
      setElections(data.map(normalizeElection));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadElections();
  }, []);

  useEffect(() => {
    if (!initialElection) return;
    setSelectedElection(initialElection);
    onInitialElectionHandled?.();
  }, [initialElection, onInitialElectionHandled]);

  if (selectedElection) {
    return <CandidateManager election={selectedElection} onBack={() => setSelectedElection(null)} />;
  }

  return (
    <ElectionPicker
      elections={elections}
      loading={loading}
      error={error}
      onReload={loadElections}
      onSelect={setSelectedElection}
    />
  );
};

export default AdminCandidates;
