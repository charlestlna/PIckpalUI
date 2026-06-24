import { Avatar } from "../../components/common";
import ChangePasswordPanel from "../../components/ChangePasswordPanel";

const ProfileScreen = ({ user, voted, onLogout }) => {
  const voter = user?.voter || {};
  const fullName = [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "Registered Voter";
  const studentNumber = voter.student_number || user?.studentNumber || "-";

  return (
    <div className="page-scroll">
      <div style={{ background:"var(--navy)", padding:"32px 20px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(13,148,136,0.12)" }} />
        <Avatar name={fullName} size={80} bg="var(--teal)" />
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"white", marginTop:14 }}>{fullName}</h2>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:14, marginTop:4 }}>{studentNumber}</p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12 }}>
          <span className="badge badge-green">Verified</span>
          <span className="badge badge-blue">{voter.department || "-"} Department</span>
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
            ["Voting Status", voted || voter.voted ? "Has voted" : "Not voted"],
          ].map(([k,v],i,arr) => (
            <div key={i} style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:i<arr.length-1?"1px solid var(--gray-100)":"none" }}>
              <span style={{ fontSize:14, color:"var(--gray-500)", fontWeight:500 }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:600, color:"var(--navy)", textAlign:"right" }}>{v}</span>
            </div>
          ))}
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
        <button className="btn-danger" style={{ width:"100%" }} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
};

export default ProfileScreen;
