// src/features/admin/NewElectionModal.jsx
import { useState } from "react";
import { Icon } from "../../components/common";

const NewElectionModal = ({ onClose, onCreated, initial = null }) => {
  const [name, setName]           = useState(initial?.title || "");
  const [startDate, setStart]     = useState(initial?.starts_at?.slice(0, 10) || "");
  const [endDate, setEnd]         = useState(initial?.ends_at?.slice(0, 10) || "");
  const [positions, setPositions] = useState(["President","Vice-President","Secretary","Treasurer","Auditor"]);
  const [newPos, setNewPos]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [error, setError]         = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(initial);
  const valid = name.trim()
    && startDate
    && endDate
    && endDate >= startDate
    && (isEditing || startDate >= today)
    && (isEditing || positions.length > 0);

  const addPosition = () => {
    const p = newPos.trim();
    if (p && !positions.includes(p)) { setPositions(ps => [...ps, p]); setNewPos(""); }
  };
  const removePosition = p => setPositions(ps => ps.filter(x => x !== p));

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
            <input className="input-field" type="date" value={startDate} min={isEditing ? undefined : today} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input-field" type="date" value={endDate} onChange={e => setEnd(e.target.value)} min={startDate || today} />
            {endDate && startDate && endDate < startDate && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>End must be after start</p>}
            {!isEditing && startDate && startDate < today && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>Choose today or a future date.</p>}
          </div>
        </div>

        {!initial && <div style={{ marginBottom:20 }}>
          <label className="label">Positions ({positions.length})</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            {positions.map((p,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,102,153,0.08)", border:"1px solid rgba(255,102,153,0.25)", borderRadius:"var(--radius-full)", padding:"5px 12px" }}>
                <span style={{ fontSize:13, fontWeight:500, color:"var(--teal)" }}>{p}</span>
                <button onClick={() => removePosition(p)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--gray-500)", fontSize:11, fontWeight:700, lineHeight:1, padding:"2px 0" }}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input className="input-field" placeholder="Add position (e.g. PRO)" value={newPos}
              onChange={e => setNewPos(e.target.value)} onKeyDown={e => e.key==="Enter" && addPosition()} style={{ flex:1 }} />
            <button className="btn-outline" style={{ padding:"10px 16px", fontSize:13, flexShrink:0 }} onClick={addPosition} disabled={!newPos.trim()}>
              <Icon name="plus" size={14} /> Add
            </button>
          </div>
        </div>}

        <div style={{ display:"flex", gap:12 }}>
          <button className="btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex:2, justifyContent:"center", opacity:valid?1:0.5 }} onClick={handleCreate} disabled={!valid||saving}>
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
      </div>
    </div>
  );
};
export default NewElectionModal;
