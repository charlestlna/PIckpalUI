// src/features/admin/AdminElections.jsx
import { useEffect, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";
import NewElectionModal from "./NewElectionModal";
import ElectionPositionsModal from "./ElectionPositionsModal";

const STATUS_BADGE = {
  open: "badge-green",
  upcoming: "badge-blue",
  closed: "badge-gray",
};

const STATUS_LABEL = {
  open: "Live",
  upcoming: "Upcoming",
  closed: "Closed",
};

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "closed", label: "Closed" },
  { id: "archived", label: "Archived" },
];

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Something went wrong.";
};

const AdminElections = ({ onNavigate, openNewElection = false, onNewElectionHandled }) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [positionElection, setPositionElection] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("active");

  const showToast = (msg, color = "var(--navy)") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

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
    if (!openNewElection) return;
    setShowModal(true);
    onNewElectionHandled?.();
  }, [openNewElection, onNewElectionHandled]);

  const handleCreated = async ({ name, startDate, endDate, positions }) => {
    const created = await api.createElection({
      title: name,
      starts_at: `${startDate}T08:00:00`,
      ends_at: `${endDate}T17:00:00`,
      positions,
    });

    const normalized = normalizeElection(created);
    setElections(prev => [normalized, ...prev]);
    setShowModal(false);
    showToast("Election created. Add candidates from the Candidates module.", "var(--teal)");
  };

  const handleUpdated = async ({ id, name, startDate, endDate }) => {
    const updated = normalizeElection(await api.updateElection(id, {
      title: name,
      starts_at: `${startDate}T08:00:00`,
      ends_at: `${endDate}T17:00:00`,
    }));

    setElections(prev => prev.map(item => item.id === updated.id ? updated : item));
    setShowModal(false);
    setEditingElection(null);
    showToast("Election updated.", "var(--teal)");
  };

  const handleStatus = async (election, status) => {
    setUpdatingId(election.id);
    setError("");

    try {
      const updated = normalizeElection(await api.updateElectionStatus(election.id, status));
      setElections(prev => prev.map(item => item.id === updated.id ? updated : item));
      showToast(`Election set to ${STATUS_LABEL[status]}.`, status === "closed" ? "var(--red)" : "var(--teal)");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePositionsUpdated = (updated) => {
    const normalized = normalizeElection(updated);
    setElections(prev => prev.map(item => item.id === normalized.id ? normalized : item));
  };

  const openPositions = async (election) => {
    setUpdatingId(election.id);
    setError("");
    try {
      const ballot = await api.adminCandidates(election.id);
      setPositionElection({ ...election, ballot });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleArchive = async (election, archived) => {
    setUpdatingId(election.id);
    setError("");

    try {
      const updated = normalizeElection(await api.updateElectionArchive(election.id, archived));
      setElections(prev => prev.map(item => item.id === updated.id ? updated : item));
      showToast(archived ? "Election archived." : "Election restored.", archived ? "var(--gray-600)" : "var(--teal)");
      if (archived && filter !== "archived") {
        setFilter("archived");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (election) => {
    if (!window.confirm(`Delete "${election.title}"? This is only allowed for draft elections with no votes.`)) return;

    setUpdatingId(election.id);
    setError("");

    try {
      await api.deleteElection(election.id);
      setElections(prev => prev.filter(item => item.id !== election.id));
      showToast("Draft election deleted.", "var(--red)");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleElections = elections.filter(election => {
    if (filter === "archived") return election.archived;
    if (election.archived) return false;
    if (filter === "active") return election.status === "open";
    return election.status === filter;
  });

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
      {showModal && (
        <NewElectionModal
          initial={editingElection}
          onClose={() => { setShowModal(false); setEditingElection(null); }}
          onCreated={editingElection ? handleUpdated : handleCreated}
        />
      )}
      {positionElection && (
        <ElectionPositionsModal
          election={positionElection}
          onClose={() => setPositionElection(null)}
          onUpdated={handlePositionsUpdated}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)" }}>Elections</h1>
          <p style={{ fontSize: 14, color: "var(--gray-500)", marginTop: 6 }}>
            Create elections, adjust schedules, manage positions, and control election status.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" onClick={() => onNavigate("dashboard")}>
            <Icon name="back" size={14} /> Back to Dashboard
          </button>
          <button className="btn-primary" onClick={() => { setEditingElection(null); setShowModal(true); }}>
            <Icon name="plus" size={16} /> New Election
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
          Loading elections...
        </div>
      )}

      {!loading && elections.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {FILTERS.map(item => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                className={selected ? "btn-primary" : "btn-outline"}
                style={{ padding: "8px 16px", fontSize: 13 }}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {!loading && elections.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="vote" size={38} color="var(--gray-300)" />
          <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14 }}>No elections yet. Use the New Election button above to get started.</p>
        </div>
      )}

      {!loading && elections.length > 0 && visibleElections.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="vote" size={38} color="var(--gray-300)" />
          <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14 }}>No {FILTERS.find(item => item.id === filter)?.label.toLowerCase()} elections to show.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!loading && visibleElections.map((election) => {
          const isUpdating = updatingId === election.id;
          const label = STATUS_LABEL[election.status] || election.status;
          const canDelete = election.status === "upcoming" && election.voted === 0;

          return (
            <div key={election.id} className="card" style={{ padding: 22, opacity: isUpdating ? 0.55 : 1, transition: "opacity 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)", margin: 0 }}>{election.title}</h2>
                  <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 4 }}>
                    {election.totalVoters} voters registered
                  </p>
                </div>
                <span className={`badge ${STATUS_BADGE[election.status] || "badge-gray"}`}>
                  {election.status === "open" && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                  {election.archived ? "Archived" : label}
                </span>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: "var(--gray-500)", fontSize: 13, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="clock" size={14} /> {election.endsIn}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="users" size={14} /> {election.voted}/{election.totalVoters} voted
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="shield" size={14} /> {election.department === "SSC" ? "All approved voters" : `${election.department} voters only`}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="candidate" size={14} /> {election.candidates} candidates - {election.positions} positions
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => onNavigate("results")}>
                  <Icon name="trophy" size={14} /> View Results
                </button>

                <button className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => openPositions(election)} disabled={isUpdating}>
                  <Icon name="vote" size={14} /> Manage Positions
                </button>

                {!election.archived && election.status === "open" && (
                  <button
                    className="btn-primary"
                    style={{ padding: "8px 16px", fontSize: 13, background: "var(--red)" }}
                    onClick={() => handleStatus(election, "closed")}
                    disabled={isUpdating}
                  >
                    {isUpdating
                      ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                      : <><Icon name="lock" size={14} /> Close Election</>}
                  </button>
                )}

                {!election.archived && election.status === "closed" && (
                  <button
                    className="btn-primary"
                    style={{ padding: "8px 16px", fontSize: 13, background: "var(--green)" }}
                    onClick={() => handleStatus(election, "open")}
                    disabled={isUpdating}
                  >
                    <Icon name="check" size={14} /> Reopen
                  </button>
                )}

                {!election.archived && election.status === "upcoming" && (
                  <button
                    className="btn-primary"
                    style={{ padding: "8px 16px", fontSize: 13 }}
                    onClick={() => handleStatus(election, "open")}
                    disabled={isUpdating}
                  >
                    <Icon name="vote" size={14} /> Open Election
                  </button>
                )}

                {!election.archived && (
                  <button title="Edit election" aria-label={`Edit ${election.title}`} className="btn-outline" style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }} onClick={() => { setEditingElection(election); setShowModal(true); }}>
                    <Icon name="edit" size={14} />
                  </button>
                )}

                {!election.archived ? (
                  <button
                    title="Archive election"
                    aria-label={`Archive ${election.title}`}
                    className="btn-outline"
                    style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }}
                    onClick={() => handleArchive(election, true)}
                    disabled={isUpdating}
                  >
                    <Icon name="archive" size={14} />
                  </button>
                ) : (
                  <button
                    title="Restore election"
                    aria-label={`Restore ${election.title}`}
                    className="btn-outline"
                    style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }}
                    onClick={() => handleArchive(election, false)}
                    disabled={isUpdating}
                  >
                    <Icon name="archive" size={14} />
                  </button>
                )}

                {canDelete && (
                  <button
                    title="Delete election"
                    aria-label={`Delete ${election.title}`}
                    style={{ width: 36, height: 36, padding: 0, borderRadius: "50%", border: "1.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => handleDelete(election)}
                    disabled={isUpdating}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminElections;
