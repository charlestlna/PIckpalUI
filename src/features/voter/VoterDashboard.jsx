import { Icon, Avatar } from "../../components/common";
import { api } from "../../lib/api";
import { normalizeElection } from "../../lib/electionFormat";
import { useApiResource } from "../../hooks/useApiResource";

const VoterDashboard = ({ user, voted, onGoVote, onGoSurvey }) => {
  const voter = user?.voter || {};
  const fullName = [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "Voter";
  const firstName = voter.first_name || "there";
  const { data, loading, error } = useApiResource(api.elections, []);
  const elections = (data || []).map(normalizeElection);
  const liveElection = elections.find(election => election.status === "open");
  const upcoming = elections.filter(election => election.status === "upcoming").slice(0, 2);
  const hasVoted = voted || voter.voted;
  const turnout = liveElection?.totalVoters > 0
    ? Math.round((liveElection.voted / liveElection.totalVoters) * 100)
    : 0;

  return (
    <div className="page-scroll">
      <div style={{ background: "var(--navy)", padding: "24px 20px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,102,153,0.15)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 20, width: 100, height: 100, borderRadius: "50%", background: "rgba(245,158,11,0.08)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, position: "relative" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>Welcome back,</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "white" }}>{firstName}</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3 }}>{voter.student_number || user?.studentNumber || ""}</p>
          </div>
          <div style={{ position: "relative" }}>
            <Avatar name={fullName} size={44} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, background: "var(--green)", borderRadius: "50%", border: "2px solid var(--navy)" }} />
          </div>
        </div>

        {loading && (
          <div className="card" style={{ padding: 18, color: "var(--gray-500)", fontSize: 13, textAlign: "center" }}>
            Loading election status...
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 18, color: "var(--red)", fontSize: 13, lineHeight: 1.5 }}>
            Could not load election status.
          </div>
        )}

        {!loading && !error && liveElection && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em" }}>LIVE NOW</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", lineHeight: 1.3 }}>{liveElection.title}</h3>
              </div>
              <span className="badge badge-green" style={{ flexShrink: 0, marginLeft: 12 }}>
                <Icon name="clock" size={11} /> {liveElection.endsIn}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Department turnout</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{turnout}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${turnout}%` }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 5 }}>
              {liveElection.voted} of {liveElection.totalVoters} voters
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: "20px 16px" }}>
        <div className="card fade-up" style={{ padding: 18, marginBottom: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", background: hasVoted ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={hasVoted ? "check" : "vote"} size={22} color={hasVoted ? "var(--green)" : "var(--gold)"} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", marginBottom: 2 }}>{hasVoted ? "Your vote is recorded" : "You have not voted yet"}</h4>
            <p style={{ fontSize: 12, color: "var(--gray-500)" }}>{hasVoted ? "You can still view candidates, surveys, and published results." : "Browse candidates and cast your ballot when ready."}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            { icon: "survey", label: "Student Survey", sub: "Optional", color: "var(--teal)", bg: "rgba(255,102,153,0.07)", action: onGoSurvey },
            { icon: "vote", label: "Cast Ballot", sub: hasVoted ? "Completed" : "~2 mins", color: "var(--navy)", bg: "rgba(48,50,58,0.05)", action: onGoVote },
          ].map((item) => (
            <button key={item.label} className="card" onClick={item.action}
              style={{ padding: 16, textAlign: "left", cursor: "pointer", border: "none", width: "100%", background: item.bg, transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(0.97)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <Icon name={item.icon} size={22} color={item.color} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 2 }}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {upcoming.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 3, height: 18, borderRadius: 99, background: "#0891B2" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>Upcoming Elections</h3>
            </div>

            {upcoming.map((election) => (
              <div key={election.id} className="card fade-up" style={{ marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: 4, background: "linear-gradient(90deg, #0891B2, #38BDF8)" }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <span className="badge badge-blue" style={{ fontSize: 10, marginBottom: 7 }}>Upcoming</span>
                      <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", lineHeight: 1.3, marginTop: 7, marginBottom: 4 }}>{election.title}</h4>
                      <p style={{ fontSize: 12, color: "var(--gray-500)" }}>{election.department === "SSC" ? "All departments" : `${election.department} Department`} - {election.positions} positions</p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed rgba(8,145,178,0.35)", background: "rgba(8,145,178,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="clock" size={18} color="#0891B2" />
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginTop: 5 }}>{election.endsIn}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;
