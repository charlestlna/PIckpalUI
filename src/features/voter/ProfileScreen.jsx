import { Avatar } from "../../components/common";
import ChangePasswordPanel from "../../components/ChangePasswordPanel";
import { api } from "../../lib/api";
import { useApiResource } from "../../hooks/useApiResource";

const ProfileScreen = ({ user, onLogout }) => {
  const voter = user?.voter || {};
  const fullName = [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "Registered Voter";
  const studentNumber = voter.student_number || user?.studentNumber || "-";
  const { data: votingStatuses, loading: votingLoading, error: votingError } = useApiResource(api.voterVotingStatus, []);

  return (
    <div className="page-scroll">
      <div className="voter-header" style={{ background:"var(--navy)", padding:"18px 20px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,102,153,0.12)" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, position:"relative" }}>
          <Avatar name={fullName} size={64} bg="var(--teal)" />
          <div style={{ textAlign:"left" }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:21, color:"white" }}>{fullName}</h2>
            <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, marginTop:3 }}>{studentNumber}</p>
            <div style={{ display:"flex", gap:6, marginTop:8 }}><span className="badge badge-green">Verified</span><span className="badge badge-blue">{voter.department || "-"}</span></div>
          </div>
        </div>
      </div>
      <div style={{ padding:"20px 16px" }}>
        <div className="card" style={{ marginBottom:16, overflow:"hidden" }}>
          {[
            ["Student Number", studentNumber],
            ["Full Name", fullName],
            ["Section", voter.section || "-"],
            ["Year Level", voter.year_level || "-"],
            ["Department", voter.department || "-"],
            ["Registration", voter.registration_status || "-"],
          ].map(([k,v],i,arr) => (
            <div key={i} style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:i<arr.length-1?"1px solid var(--gray-100)":"none" }}>
              <span style={{ fontSize:14, color:"var(--gray-500)", fontWeight:500 }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:600, color:"var(--navy)", textAlign:"right" }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:20, marginBottom:16 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:"var(--navy)", marginBottom:14 }}>Voting Status</h4>
          {votingLoading && <p style={{ fontSize:13, color:"var(--gray-400)" }}>Loading election status...</p>}
          {votingError && <p style={{ fontSize:13, color:"var(--red)" }}>Could not load voting status.</p>}
          {!votingLoading && !votingError && (votingStatuses || []).length === 0 && <p style={{ fontSize:13, color:"var(--gray-400)" }}>No elections available yet.</p>}
          {!votingLoading && !votingError && (votingStatuses || []).map((election, index, list) => {
            const label = election.has_voted ? "Voted" : election.status === "upcoming" ? "Upcoming" : election.status === "closed" ? "Not voted" : "Pending";
            const badge = election.has_voted ? "badge-green" : election.status === "upcoming" ? "badge-blue" : election.status === "closed" ? "badge-gray" : "badge-gold";
            return (
              <div key={election.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"11px 0", borderBottom:index < list.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
                <div style={{ minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:"var(--navy)", overflowWrap:"anywhere" }}>{election.title}</div><div style={{ fontSize:11, color:"var(--gray-400)", marginTop:2 }}>{election.department === "SSC" ? "All departments" : election.department}</div></div>
                <span className={`badge ${badge}`} style={{ flexShrink:0 }}>{label}</span>
              </div>
            );
          })}
        </div>
        <div className="card" style={{ padding:20, marginBottom:16 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:"var(--navy)", marginBottom:14 }}>Security</h4>
          {[
            ["Face ID", voter.face_registered ? "Registered" : "Not registered"],
            ["Password", "********"],
          ].map(([k,v],i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:i===0?"1px solid var(--gray-100)":"none" }}>
              <span style={{ fontSize:14, color:"var(--gray-500)" }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:600, color:"var(--teal)" }}>{v}</span>
            </div>
          ))}
        </div>
        <ChangePasswordPanel role="voter" />
        <button className="btn-danger" style={{ width:"100%" }} onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
};

export default ProfileScreen;
