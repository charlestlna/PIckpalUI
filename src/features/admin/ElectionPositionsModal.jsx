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
  const [details, setDetails] = useState(election.ballot ? election : null);
  const [loading, setLoading] = useState(!election.ballot);
  const [savingId, setSavingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState({});
  const [error, setError] = useState("");
  const [confirmingAdd, setConfirmingAdd] = useState(false);

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
    if (election.ballot) {
      setDetails(election);
      setEditing(Object.fromEntries(election.ballot.map(position => [position.id, position.name])));
      setLoading(false);
      return;
    }
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, position: "sticky", top: -32, zIndex: 10, background: "white", padding: "32px 0 16px", margin: "-32px 0 20px", borderBottom: "1px solid var(--gray-100)" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)", marginBottom: 4 }}>Manage Positions</h2>
            <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>{election.title}</p>
          </div>
          <button title="Close" aria-label="Close manage positions" onClick={onClose} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--gray-500)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={15} /></button>
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

            <div className="card" style={{ padding: 14, marginBottom: 16, opacity: hasVotes ? 0.55 : 1 }}>
              <label className="label">Add Position</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input-field" placeholder="e.g. Public Relations Officer" value={newName} onChange={event => setNewName(event.target.value)} disabled={hasVotes} onKeyDown={event => event.key === "Enter" && newName.trim() && setConfirmingAdd(true)} />
                <button title="Add position" aria-label="Add position" className="btn-primary" style={{ width: 44, height: 44, padding: 0, flexShrink: 0, justifyContent: "center" }} disabled={hasVotes || !newName.trim() || savingId === "new"} onClick={() => setConfirmingAdd(true)}>
                  <Icon name="plus" size={17} />
                </button>
              </div>
            </div>

            {confirmingAdd && (
              <div style={{ padding: 14, border: "1px solid var(--teal)", borderRadius: "var(--radius-sm)", background: "rgba(255,102,153,0.06)", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>Add <strong>{newName.trim()}</strong> to this election?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button title="Cancel" aria-label="Cancel adding position" className="btn-outline" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }} onClick={() => setConfirmingAdd(false)}><Icon name="close" size={14} /></button>
                  <button title="Confirm" aria-label="Confirm adding position" className="btn-primary" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }} onClick={() => { setConfirmingAdd(false); addPosition(); }}><Icon name="check" size={14} /></button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {(details?.ballot || []).map(position => {
                const isSaving = savingId === position.id;
                const candidateCount = position.candidates?.length || 0;

                return (
                  <div key={position.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,102,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="vote" size={16} color="var(--teal)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          className="input-field"
                          value={editing[position.id] || ""}
                          onChange={event => setEditing(current => ({ ...current, [position.id]: event.target.value }))}
                          onBlur={() => renamePosition(position)}
                          onKeyDown={event => event.key === "Enter" && event.currentTarget.blur()}
                        />
                        <p style={{ fontSize: 11, color: "var(--gray-400)", margin: "5px 0 0" }}>{isSaving ? "Saving name..." : `${candidateCount} candidates - name saves automatically`}</p>
                      </div>
                      <button
                        title="Remove position"
                        aria-label={`Remove ${position.name}`}
                        style={{ width: 44, height: 44, padding: 0, borderRadius: "var(--radius-full)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: hasVotes || candidateCount > 0 ? "var(--gray-400)" : "var(--red)", cursor: hasVotes || candidateCount > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-start" }}
                        disabled={hasVotes || candidateCount > 0 || isSaving}
                        onClick={() => deletePosition(position)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </>
        )}

      </div>
    </div>
  );
};

export default ElectionPositionsModal;
