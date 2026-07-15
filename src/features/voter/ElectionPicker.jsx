// src/features/voter/ElectionPicker.jsx
import { useEffect, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";
import { useApiResource } from "../../hooks/useApiResource";

const STATUS_CONFIG = {
  open: { label: "Live", badgeClass: "badge-green", dot: true },
  closed: { label: "Closed", badgeClass: "badge-gray", dot: false },
  upcoming: { label: "Upcoming", badgeClass: "badge-blue", dot: false },
};

const MODE_CONFIG = {
  vote: {
    heading:     "Vote",
    subheading:  "Tap an open election to cast your ballot.",
    actionLabel: "Open Ballot",
    accent:      "var(--teal)",
    isDisabled:  (e) => e.status !== "open",
  },
  candidates: {
    heading:     "Candidates",
    subheading:  "Tap an open election to browse its candidates.",
    actionLabel: "Browse Candidates",
    accent:      "#7C3AED",
    isDisabled:  (e) => e.status !== "open",
  },
};

const getVoteBlockReason = (election, user) => {
  const voter = user?.voter;
  const allDepartmentsElection = election.department === "SSC";

  if (!voter) return "Sign in again to verify voter eligibility.";
  if (voter.registration_status !== "approved") return `Account is ${voter.registration_status}. Admin approval is required.`;
  if (election.status !== "open") return election.status === "upcoming" ? "Voting has not opened yet." : "Election is closed.";
  if (!allDepartmentsElection && voter.department && election.department && voter.department !== election.department) return `Only ${election.department} voters can vote here.`;
  return "";
};

const ActiveElectionCard = ({ election, mode, onSelect, user }) => {
  const cfg      = STATUS_CONFIG[election.status];
  const modeCfg  = MODE_CONFIG[mode];
  const localBlockReason = mode === "vote" ? getVoteBlockReason(election, user) : "";
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const eligibilityReason = eligibility?.eligible === false ? eligibility.reasons?.[0] || "You are not eligible for this election." : "";
  const blockReason = localBlockReason || eligibilityReason;
  const disabled = modeCfg.isDisabled(election) || Boolean(blockReason) || checkingEligibility;
  const turnout  = election.totalVoters > 0
    ? Math.round((election.voted / election.totalVoters) * 100) : 0;

  useEffect(() => {
    if (mode !== "vote" || election.status !== "open" || localBlockReason) {
      setEligibility(null);
      setCheckingEligibility(false);
      return;
    }

    let alive = true;
    setCheckingEligibility(true);
    api.voteEligibility(election.id)
      .then(result => {
        if (alive) setEligibility(result);
      })
      .catch(() => {
        if (alive) setEligibility({ eligible: false, reasons: ["Could not verify eligibility."] });
      })
      .finally(() => {
        if (alive) setCheckingEligibility(false);
      });

    return () => {
      alive = false;
    };
  }, [mode, election.id, election.status, localBlockReason]);

  return (
    <button
      onClick={() => !disabled && onSelect(election)}
      disabled={disabled}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: 0,
        background: "white", border: "none", borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)", marginBottom: 12, overflow: "hidden",
        borderLeft: `4px solid ${disabled ? "var(--gray-200)" : modeCfg.accent}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.18s",
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(48,50,58,0.12)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    >
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--navy)", lineHeight: 1.3, margin: 0, flex: 1 }}>
            {election.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {cfg.dot && <div className="live-dot" style={{ width: 7, height: 7 }} />}
            <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: 10 }}>{cfg.label}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: election.status !== "upcoming" ? 10 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--gray-500)" }}>
            <Icon name="clock" size={12} color="var(--gray-400)" />
            {election.endsIn} - {election.status === "open" ? "remaining" : "ended"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--gray-500)" }}>
            <Icon name="candidate" size={12} color="var(--gray-400)" />
            {election.candidates} candidates - {election.positions} positions
          </div>
        </div>

        {election.status !== "upcoming" && election.totalVoters > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--gray-400)" }}>Turnout</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>{turnout}% - {election.voted}/{election.totalVoters}</span>
            </div>
            <div style={{ height: 5, background: "var(--gray-100)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${turnout}%`, background: `linear-gradient(90deg, ${modeCfg.accent}, ${modeCfg.accent}88)` }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {disabled ? (
            <span style={{ fontSize: 12, color: "var(--gray-400)", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="lock" size={12} color="var(--gray-300)" /> {checkingEligibility ? "Checking eligibility..." : blockReason || "Election closed"}
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: modeCfg.accent, display: "flex", alignItems: "center", gap: 5 }}>
              {modeCfg.actionLabel} <Icon name="arrow" size={13} color={modeCfg.accent} />
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--gray-300)" }}>{election.openDate} - {election.closeDate}</span>
        </div>
      </div>
    </button>
  );
};

const UpcomingElectionCard = ({ election }) => (
  <div className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
    <div style={{ height: 4, background: "linear-gradient(90deg, #0891B2, #38BDF8)" }} />
    <div style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <span className="badge badge-blue" style={{ fontSize: 10 }}>Upcoming</span>
            <span style={{ fontSize: 11, color: "var(--gray-400)" }}>{election.openDate} - {election.closeDate}</span>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", lineHeight: 1.3, marginBottom: 4 }}>
            {election.title}
          </h3>
          <p style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
            {election.department === "SSC" ? "All departments" : `${election.department} Department`} - {election.positions} positions
          </p>
          <div style={{ background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.18)", borderRadius: "var(--radius-sm)", padding: "9px 13px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Icon name="info" size={13} color="#0891B2" />
            <p style={{ fontSize: 11, color: "#0369A1", margin: 0, lineHeight: 1.5 }}>
              Voting opens in <strong>{election.endsIn.replace("Opens in ", "")}</strong>. Candidates will be visible once the election is live.
            </p>
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed rgba(8,145,178,0.35)", background: "rgba(8,145,178,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="clock" size={20} color="#0891B2" />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginTop: 5 }}>{election.endsIn}</p>
        </div>
      </div>
    </div>
  </div>
);

const ElectionPicker = ({ mode, onSelect, user }) => {
  const { heading, subheading } = MODE_CONFIG[mode];
  const { data, loading, error } = useApiResource(api.elections, []);
  const elections = (data || []).map(normalizeElection);
  const activeElections   = elections.filter(e => e.status === "open");
  const upcomingElections = elections.filter(e => e.status === "upcoming");

  return (
    <div className="page-scroll">
      <div className="voter-header" style={{ background: "var(--navy)", padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Icon name={mode === "vote" ? "vote" : "candidate"} size={20} color="var(--teal-light)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>{heading}</h2>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{subheading}</p>
      </div>

      <div style={{ padding: "16px 16px 20px" }}>
        {loading && (
          <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
            Loading elections...
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13, lineHeight: 1.5 }}>
            Could not load elections from the Laravel API. Check that the backend is running.
          </div>
        )}

        {!loading && !error && activeElections.length === 0 && upcomingElections.length === 0 && (
          <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14, lineHeight: 1.5 }}>
            {mode === "vote"
              ? "No elections are available for voting right now."
              : "No candidate lists are available right now."}
          </div>
        )}

        {!loading && !error && activeElections.map(election => (
          <ActiveElectionCard key={election.id} election={election} mode={mode} onSelect={onSelect} user={user} />
        ))}

        {!loading && !error && upcomingElections.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 14px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--gray-100)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Coming Soon
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--gray-100)" }} />
            </div>
            {upcomingElections.map(election => (
              <UpcomingElectionCard key={election.id} election={election} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ElectionPicker;
