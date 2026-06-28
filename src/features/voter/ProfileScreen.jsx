import { useState } from "react";
import { Avatar, Icon } from "../../components/common";
import ChangePasswordPanel from "../../components/ChangePasswordPanel";
import { api } from "../../lib/api";

const ProfileScreen = ({ user, onLogout, onUserUpdate }) => {
  const voter = user?.voter || {};
  const fullName = [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "Registered Voter";
  const studentNumber = voter.student_number || user?.studentNumber || "-";
  const [photoUrl, setPhotoUrl] = useState(voter.profile_photo_url || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const photoChanged = photoUrl !== (voter.profile_photo_url || "");

  const handlePhoto = (file) => {
    setMessage("");
    setError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 450 * 1024) {
      setError("Please choose an image smaller than 450 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingPhoto(true);

      try {
        const result = await api.uploadImage({ type: "profile", image_data: reader.result });
        setPhotoUrl(result.url);
      } catch (err) {
        setError(err.message || "Could not upload profile image.");
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.onerror = () => setError("Could not read the selected image.");
    reader.readAsDataURL(file);
  };

  const savePhoto = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await api.updateVoterProfilePhoto({ profile_photo_url: photoUrl || null });
      onUserUpdate?.(result.user);
      setMessage(photoUrl ? "Profile image saved." : "Profile image removed.");
    } catch (err) {
      setError(err.message || "Could not update profile image.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll">
      <div style={{ background:"var(--navy)", padding:"32px 20px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,102,153,0.12)" }} />
        <Avatar name={fullName} size={80} bg="var(--teal)" src={photoUrl} />
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"white", marginTop:14 }}>{fullName}</h2>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:14, marginTop:4 }}>{studentNumber}</p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12 }}>
          <span className="badge badge-green">Verified</span>
          <span className="badge badge-blue">{voter.department || "-"} Department</span>
        </div>
      </div>
      <div style={{ padding:"20px 16px" }}>
        <div className="card" style={{ padding:20, marginBottom:16 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:"var(--navy)", marginBottom:14 }}>Profile Image</h4>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Avatar name={fullName} size={58} bg="var(--teal)" src={photoUrl} />
            <div style={{ flex:1, minWidth:0 }}>
              <label className="btn-outline" style={{ width:"100%", justifyContent:"center", cursor:"pointer", marginBottom:8 }}>
                <Icon name="upload" size={16} />
                Choose Image
                <input type="file" accept="image/*" onChange={event => handlePhoto(event.target.files?.[0])} style={{ display:"none" }} disabled={uploadingPhoto} />
              </label>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn-primary" style={{ flex:1, padding:"10px 12px", fontSize:13, opacity: !photoChanged || saving || uploadingPhoto ? 0.6 : 1 }} onClick={savePhoto} disabled={!photoChanged || saving || uploadingPhoto}>
                  {saving ? "Saving..." : uploadingPhoto ? "Uploading..." : "Save"}
                </button>
                <button className="btn-outline" style={{ flex:1, padding:"10px 12px", fontSize:13 }} onClick={() => setPhotoUrl("")} disabled={saving || !photoUrl}>
                  Remove
                </button>
              </div>
            </div>
          </div>
          {message && <p style={{ color:"var(--green)", fontSize:12, fontWeight:600, marginTop:10 }}>{message}</p>}
          {error && <p style={{ color:"var(--red)", fontSize:12, fontWeight:600, marginTop:10 }}>{error}</p>}
        </div>
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
