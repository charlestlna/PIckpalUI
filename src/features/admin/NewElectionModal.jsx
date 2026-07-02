// src/features/admin/NewElectionModal.jsx
import { useState } from "react";
import { Icon } from "../../components/common";

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "PIO",
  "Sports Coordinator",
  "1st Year Representative",
  "2nd Year Representative",
  "3rd Year Representative",
];

const NewElectionModal = ({ onClose, onCreated, initial = null }) => {
  const [name, setName]           = useState(initial?.title || "");
  const [startDate, setStart]     = useState(initial?.starts_at?.slice(0, 10) || "");
  const [endDate, setEnd]         = useState(initial?.ends_at?.slice(0, 10) || "");
  const [positions, setPositions] = useState([...DEFAULT_POSITIONS]);
  const [customPositions, setCustomPositions] = useState([]);
  const [newPos, setNewPos]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [error, setError]         = useState("");
  const [confirming, setConfirming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(initial);
  const valid = name.trim()
    && startDate
    && endDate
    && endDate >= startDate
    && startDate >= today
    && (isEditing || positions.length > 0);

  const toggleDefault = position => setPositions(current => current.includes(position)
    ? current.filter(item => item !== position)
    : [...current, position]);
  const addPosition = () => {
    const position = newPos.trim();
    if (!position || positions.some(item => item.toLowerCase() === position.toLowerCase())) return;
    setPositions(current => [...current, position]);
    setCustomPositions(current => [...current, position]);
    setNewPos("");
  };
  const removeCustomPosition = position => {
    setPositions(current => current.filter(item => item !== position));
    setCustomPositions(current => current.filter(item => item !== position));
  };

  const handleCreate = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");

    try {
      await onCreated?.({ id: initial?.id, name, startDate, endDate, positions });
      setSaving(false);
      setToast(isEditing ? "Election updated successfully." : "Election created successfully.");
      setTimeout(() => onClose(), 900);
    } catch (err) {
      const firstFieldError = err.errors
        ? Object.values(err.errors).flat().find(Boolean)
        : null;

      setError(firstFieldError || err.message || "Could not create election.");
      setSaving(false);
    }
  };

  return (
    <div className="overlay-centered" onClick={e => e.target === e.currentTarget && onClose()}>
      {toast && <div className="toast" style={{ bottom:"50%", transform:"translate(-50%,50%)" }}>{toast}</div>}
      <div className="modal-centered">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"var(--navy)" }}>{initial ? "Edit Election" : "New Election"}</h2>
            <p style={{ fontSize:13, color:"var(--gray-500)", marginTop:3 }}>
              {isEditing ? "Update election title, start date, and end date" : "Create an election for your department"}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"var(--gray-100)", border:"none", borderRadius:"var(--radius-full)", minWidth:58, height:32, padding:"0 12px", cursor:"pointer", fontSize:12, fontWeight:700, color:"var(--gray-500)", display:"flex", alignItems:"center", justifyContent:"center" }}>Close</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="label">Election Name</label>
          <input className="input-field" placeholder="e.g. SSC Elections AY 2025-2026" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label className="label">Start Date</label>
            <input className="input-field" type="date" value={startDate} min={today} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input-field" type="date" value={endDate} onChange={e => setEnd(e.target.value)} min={startDate || today} />
            {endDate && startDate && endDate < startDate && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>End must be after start</p>}
            {startDate && startDate < today && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>Choose today or a future date.</p>}
          </div>
        </div>

        {!initial && <div style={{ marginBottom:20 }}>
          <label className="label">Default Positions</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8, marginBottom:12 }}>
            {DEFAULT_POSITIONS.map(position => (
              <label key={position} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", border:"1px solid var(--gray-200)", borderRadius:"var(--radius-sm)", fontSize:13, color:"var(--navy)", cursor:"pointer" }}>
                <input type="checkbox" checked={positions.includes(position)} onChange={() => toggleDefault(position)} />
                {position}
              </label>
            ))}
          </div>
          <label className="label">Additional Position</label>
          <div style={{ display:"flex", gap:8 }}>
            <input className="input-field" placeholder="Add another position" value={newPos} onChange={event => setNewPos(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addPosition(); } }} />
            <button type="button" className="btn-outline" style={{ padding:"10px 16px", fontSize:13, flexShrink:0 }} onClick={addPosition} disabled={!newPos.trim()}><Icon name="plus" size={14} /> Add</button>
          </div>
          {customPositions.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
              {customPositions.map(position => (
                <div key={position} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 10px", border:"1px solid var(--gray-200)", borderRadius:"var(--radius-sm)", background:"var(--gray-50)", fontSize:12, color:"var(--navy)" }}>
                  {position}
                  <button type="button" title={`Remove ${position}`} aria-label={`Remove ${position}`} onClick={() => removeCustomPosition(position)} style={{ display:"flex", padding:1, background:"none", color:"var(--red)" }}><Icon name="trash" size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>}

        <div style={{ display:"flex", gap:12 }}>
          <button className="btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex:2, justifyContent:"center", opacity:valid?1:0.5 }} onClick={() => isEditing ? handleCreate() : setConfirming(true)} disabled={!valid||saving}>
            {saving
              ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", animation:"spin 0.7s linear infinite" }} />
              : initial ? "Save Changes" : <><Icon name="plus" size={15} /> Create Election</>}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        {confirming && (
          <div className="overlay-centered" style={{ zIndex: 240 }}>
            <div className="modal-centered" style={{ maxWidth: 420 }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--navy)", marginBottom:8 }}>Create this election?</h3>
              <p style={{ fontSize:13, color:"var(--gray-600)", lineHeight:1.6, marginBottom:20 }}>Please confirm the title, dates, and {positions.length} selected position{positions.length !== 1 ? "s" : ""}.</p>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setConfirming(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex:1, justifyContent:"center" }} onClick={() => { setConfirming(false); handleCreate(); }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default NewElectionModal;
