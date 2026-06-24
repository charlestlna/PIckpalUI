import { useEffect, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Could not update positions.";
};

const ElectionPositionsModal = ({ election, onClose, onUpdated }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState({});
  const [error, setError] = useState("");

  const loadDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.election(election.id);
      setDetails(data);
      setEditing(Object.fromEntries((data.ballot || []).map(position => [position.id, position.name])));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [election.id]);

  const applyUpdate = (updated) => {
    setDetails(updated);
    setEditing(Object.fromEntries((updated.ballot || []).map(position => [position.id, position.name])));
    onUpdated?.(updated);
  };

  const addPosition = async () => {
    const name = newName.trim();
    if (!name) return;

    setSavingId("new");
    setError("");

    try {
      const updated = await api.createPosition(election.id, { name });
      applyUpdate(updated);
      setNewName("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const renamePosition = async (position) => {
    const name = editing[position.id]?.trim();
    if (!name || name === position.name) return;

    setSavingId(position.id);
    setError("");

    try {
      applyUpdate(await api.updatePosition(election.id, position.id, { name }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const deletePosition = async (position) => {
    setSavingId(position.id);
    setError("");

    try {
      applyUpdate(await api.deletePosition(election.id, position.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const hasVotes = Boolean(details?.voted);

  return (
    <div className="overlay-centered" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-centered" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)", marginBottom: 4 }}>Manage Positions</h2>
            <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>{election.title}</p>
          </div>
          <button onClick={onClose} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--gray-500)" }}>x</button>
        </div>

        {loading && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
            Loading positions...
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {!loading && (
          <>
            {hasVotes && (
              <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "var(--gray-600)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                This election already has votes, so adding and deleting positions is locked. You can still rename labels.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {(details?.ballot || []).map(position => {
                const changed = editing[position.id]?.trim() && editing[position.id].trim() !== position.name;
                const isSaving = savingId === position.id;
                const candidateCount = position.candidates?.length || 0;

                return (
                  <div key={position.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(13,148,136,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="vote" size={16} color="var(--teal)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          className="input-field"
                          value={editing[position.id] || ""}
                          onChange={event => setEditing(current => ({ ...current, [position.id]: event.target.value }))}
                        />
                        <p style={{ fontSize: 11, color: "var(--gray-400)", margin: "5px 0 0" }}>{candidateCount} candidates</p>
                      </div>
                      <button className="btn-primary" style={{ padding: "8px 12px", fontSize: 12, opacity: changed ? 1 : 0.5 }} disabled={!changed || isSaving} onClick={() => renamePosition(position)}>
                        {isSaving ? "Saving..." : "Rename"}
                      </button>
                      <button
                        style={{ padding: "8px 12px", fontSize: 12, borderRadius: "var(--radius-full)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: hasVotes || candidateCount > 0 ? "var(--gray-400)" : "var(--red)", cursor: hasVotes || candidateCount > 0 ? "not-allowed" : "pointer", fontWeight: 700 }}
                        disabled={hasVotes || candidateCount > 0 || isSaving}
                        onClick={() => deletePosition(position)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding: 14, opacity: hasVotes ? 0.55 : 1 }}>
              <label className="label">Add Position</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input-field" placeholder="e.g. PRO" value={newName} onChange={event => setNewName(event.target.value)} disabled={hasVotes} onKeyDown={event => event.key === "Enter" && addPosition()} />
                <button className="btn-primary" style={{ padding: "10px 16px", flexShrink: 0 }} disabled={hasVotes || !newName.trim() || savingId === "new"} onClick={addPosition}>
                  <Icon name="plus" size={14} /> Add
                </button>
              </div>
            </div>
          </>
        )}

        <button className="btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ElectionPositionsModal;
