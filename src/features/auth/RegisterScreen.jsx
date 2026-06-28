// src/features/auth/RegisterScreen.jsx
// Students register themselves. Flow: fill form, face scan, done.
// Admin can then approve or reject from the Voters module.
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { captureFaceDescriptor, loadFaceModels } from "../../lib/faceRecognition";

const DEPARTMENTS = ["CLA","CED","CHM","CCS","CBA","CCJE"];
const YEARS       = ["1st Year","2nd Year","3rd Year","4th Year"];
const SECTION_LETTERS = ["A", "B", "C", "D", "E"];

const nameOnly = (value) => value.replace(/[^A-Za-zÑñ.\-'\s]/g, "").replace(/\s{2,}/g, " ");
const namePattern = /^[A-Za-zÑñ.\-'\s]+$/;
const yearNumber = (year) => year.match(/\d/)?.[0] || "1";
const sectionOptions = (department, year) => SECTION_LETTERS.map(letter => `${department}-${yearNumber(year)}${letter}`);

const CORNER_STYLES = [
  { top:8,    left:8,   borderWidth:"3px 0 0 3px" },
  { top:8,    right:8,  borderWidth:"3px 3px 0 0" },
  { bottom:8, left:8,   borderWidth:"0 0 3px 3px" },
  { bottom:8, right:8,  borderWidth:"0 3px 3px 0" },
];

const STEPS = ["Account Info","Face Scan","Done"];
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Field = ({ label, name, value, error, type = "text", placeholder, rightEl, onChange }) => (
  <div style={{ marginBottom: 14 }}>
    <label className="label">{label}</label>
    <div style={{ position: "relative" }}>
      <input
        className="input-field"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(name, name === "studentId" ? e.target.value.replace(/\D/g, "").slice(0, 9) : name.toLowerCase().includes("name") ? nameOnly(e.target.value) : e.target.value)}
        inputMode={name === "studentId" ? "numeric" : undefined}
        maxLength={name === "studentId" ? 9 : undefined}
        autoComplete="off"
        style={{ paddingRight: rightEl ? 46 : undefined, borderColor: error ? "var(--red)" : undefined }}
      />
      {rightEl}
    </div>
    {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{error}</p>}
  </div>
);

const RegisterScreen = ({ onDone }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState({
    studentId: "", email: "", password: "", confirmPassword: "",
    firstName: "", middleName: "", lastName: "",
    department: "CCS", year: "1st Year", section: "CCS-1A",
  });
  const [errors, setErrors]   = useState({});
  const [showPass, setShowP]  = useState(false);
  const [showConf, setShowC]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned,  setScanned]  = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanStatus, setScanStatus] = useState("Camera permission is required before registration.");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (step !== 1) {
      stopCamera();
      return;
    }

    startCamera();

    return () => stopCamera();
  }, [step]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError("");
    setSubmitError("");
    setScanned(false);
    setFaceDescriptor(null);
    setScanning(false);
    setScanStatus("Loading face recognition models...");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support camera access. Try Chrome, Edge, or another modern browser.");
      setScanStatus("Camera unavailable.");
      return;
    }

    try {
      await loadFaceModels();
      setScanStatus("Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setScanStatus("Center your face inside the frame, then start the scan.");
    } catch (error) {
      setCameraError(error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access and try again."
        : "Could not start face recognition. Check camera permission and model files.");
      setScanStatus("Camera unavailable.");
    }
  };

  // Validate step 0.
  const validate = () => {
    const e = {};
    if (!/^\d{9}$/.test(form.studentId.trim()))  e.studentId  = "Student number must be exactly 9 digits.";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email required.";
    if (!form.firstName.trim())  e.firstName  = "First name is required.";
    else if (!namePattern.test(form.firstName.trim())) e.firstName = "First name can only contain letters and common name marks.";
    if (form.middleName.trim() && !namePattern.test(form.middleName.trim())) e.middleName = "Middle name can only contain letters and common name marks.";
    if (!form.lastName.trim())   e.lastName   = "Last name is required.";
    else if (!namePattern.test(form.lastName.trim())) e.lastName = "Last name can only contain letters and common name marks.";
    if (!form.section.trim())    e.section    = "Section is required.";
    if (form.password.length < 8) e.password  = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(1); };

  const startScan = async () => {
    if (!cameraReady || scanning) return;

    setScanning(true);
    setScanned(false);
    setCameraError("");
    setScanStatus("Scanning for a face...");

    try {
      const deadline = Date.now() + 9000;

      while (Date.now() < deadline) {
        const descriptor = await captureFaceDescriptor(videoRef.current);

        if (descriptor) {
          setFaceDescriptor(descriptor);
          setScanned(true);
          setScanStatus("Face registered successfully.");
          return;
        }

        await wait(400);
      }

      setCameraError("No clear face was detected. Move closer, improve lighting, and try again.");
      setScanStatus("Face not detected.");
    } catch {
      setCameraError("Face recognition could not complete. Please try again.");
      setScanStatus("Scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const getErrorMessage = (error) => {
    const firstFieldError = error?.errors
      ? Object.values(error.errors).flat().find(Boolean)
      : null;

    return firstFieldError || error?.message || "Could not submit registration.";
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      await api.registerVoter({
        student_number: form.studentId.trim(),
        email: form.email.trim(),
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        department: form.department,
        year_level: form.year,
        section: form.section.trim(),
        password: form.password,
        face_registered: true,
        face_descriptor: faceDescriptor,
      });

      stopCamera();
      setStep(2);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (name, value) => {
    set(name, value);
    setErrors(er => ({ ...er, [name]: undefined }));
  };

  const updateDepartment = (value) => {
    setForm(current => ({ ...current, department: value, section: sectionOptions(value, current.year)[0] }));
  };

  const updateYear = (value) => {
    setForm(current => ({ ...current, year: value, section: sectionOptions(current.department, value)[0] }));
  };

  // password strength
  const strength = [
    form.password.length >= 8,
    /[0-9]/.test(form.password),
    /[^a-zA-Z0-9]/.test(form.password) || form.password.length >= 12,
  ];
  const strengthColors  = strength.map(ok => ok ? "var(--teal)" : "var(--gray-200)");
  const strengthLabel   = strength.filter(Boolean).length;
  const strengthText    = ["","Weak","Fair","Strong"][strengthLabel];

  return (
    <div style={{ minHeight:"100vh", background:"var(--navy)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-100, right:-80, width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,102,153,0.18) 0%,transparent 70%)" }} />
      <div style={{ position:"absolute", bottom:-80, left:-60, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,0.12) 0%,transparent 70%)" }} />

      <div style={{ width:"100%", maxWidth:480, position:"relative" }}>

        {/* Logo */}
        <div className="fade-up" style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:58, height:58, background:"linear-gradient(135deg,var(--teal),var(--teal-light))", borderRadius:"18px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:"0 8px 32px rgba(255,102,153,0.4)" }}>
            <Icon name="vote" size={28} color="white" />
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:30, color:"white" }}>PickPal</h1>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, marginTop:3 }}>Dominican College of Tarlac - Voter Registration</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:24 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width: i <= step ? 26 : 22, height: i <= step ? 26 : 22, borderRadius:"50%", background: i < step ? "var(--teal)" : i === step ? "white" : "rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: i === step ? "var(--navy)" : "white", transition:"all 0.3s" }}>
                {i < step ? <Icon name="check" size={13} color="white" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={{ width:32, height:2, background: i < step ? "var(--teal)" : "rgba(255,255,255,0.2)", transition:"background 0.3s" }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Account Info */}
        {step === 0 && (
          <div className="card scale-in" style={{ padding:"28px 24px" }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--navy)", marginBottom:4 }}>Create Your Account</h2>
            <p style={{ fontSize:13, color:"var(--gray-500)", marginBottom:22 }}>Fill in your details to register as a voter.</p>

            {/* Student info */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
              <div style={{ gridColumn:"1/-1" }}>
                <Field label="Student Number" name="studentId" value={form.studentId} error={errors.studentId} placeholder="e.g. 123456789" onChange={setField} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <Field label="Email Address" name="email" value={form.email} error={errors.email} type="email" placeholder="e.g. juan@dct.edu.ph" onChange={setField} />
              </div>
              <Field label="First Name" name="firstName" value={form.firstName} error={errors.firstName} placeholder="First name" onChange={setField} />
              <Field label="Middle Name" name="middleName" value={form.middleName} error={errors.middleName} placeholder="Middle name (optional)" onChange={setField} />
              <div style={{ gridColumn:"1/-1" }}>
                <Field label="Last Name" name="lastName" value={form.lastName} error={errors.lastName} placeholder="Last name" onChange={setField} />
              </div>

              {/* Dept + Year + Section */}
              <div>
                <label className="label">Department</label>
                <select className="input-field" value={form.department} onChange={e => updateDepartment(e.target.value)} style={{ marginBottom:14 }}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year Level</label>
                <select className="input-field" value={form.year} onChange={e => updateYear(e.target.value)} style={{ marginBottom:14 }}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label">Section</label>
                <select className="input-field" value={form.section} onChange={e => setField("section", e.target.value)} style={{ borderColor: errors.section ? "var(--red)" : undefined }}>
                  {sectionOptions(form.department, form.year).map(section => <option key={section}>{section}</option>)}
                </select>
                {errors.section && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>{errors.section}</p>}
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom:14 }}>
              <label className="label">Password</label>
              <div style={{ position:"relative" }}>
                <input className="input-field" type={showPass?"text":"password"} placeholder="At least 8 characters" value={form.password}
                  onChange={e => { set("password", e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                  style={{ paddingRight:46, borderColor: errors.password ? "var(--red)" : undefined }} />
                <button onClick={() => setShowP(!showPass)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--gray-400)" }}>
                  <Icon name={showPass?"eyeOff":"eye"} size={17} />
                </button>
              </div>
              {form.password.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                    {strengthColors.map((c, i) => <div key={i} style={{ height:4, flex:1, borderRadius:99, background:c, transition:"background 0.3s" }} />)}
                  </div>
                  {strengthText && <span style={{ fontSize:11, color: strengthLabel === 3 ? "var(--teal)" : strengthLabel === 2 ? "var(--gold)" : "var(--red)" }}>{strengthText}</span>}
                </div>
              )}
              {errors.password && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>{errors.password}</p>}
            </div>

            <div style={{ marginBottom:22 }}>
              <label className="label">Confirm Password</label>
              <div style={{ position:"relative" }}>
                <input className="input-field" type={showConf?"text":"password"} placeholder="Repeat your password" value={form.confirmPassword}
                  onChange={e => { set("confirmPassword", e.target.value); setErrors(er => ({ ...er, confirmPassword: undefined })); }}
                  style={{ paddingRight:46, borderColor: errors.confirmPassword ? "var(--red)" : undefined }} />
                <button onClick={() => setShowC(!showConf)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--gray-400)" }}>
                  <Icon name={showConf?"eyeOff":"eye"} size={17} />
                </button>
              </div>
              {errors.confirmPassword && <p style={{ color:"var(--red)", fontSize:12, marginTop:4 }}>{errors.confirmPassword}</p>}
            </div>

            <button className="btn-primary" style={{ width:"100%", justifyContent:"center" }} onClick={handleNext}>
              Continue to Face Scan <Icon name="arrow" size={16} />
            </button>

            <p style={{ textAlign:"center", fontSize:12, color:"var(--gray-400)", marginTop:14 }}>
              Already registered?{" "}
              <button onClick={onDone} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--teal)", fontSize:12, fontWeight:600 }}>Sign in</button>
            </p>
          </div>
        )}

        {/* STEP 1: Face Scan */}
        {step === 1 && (
          <div className="card scale-in" style={{ padding:"28px 24px" }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--navy)", marginBottom:4 }}>Register Your Face</h2>
            <p style={{ fontSize:13, color:"var(--gray-500)", marginBottom:22 }}>Your facial data is hashed and never stored as a raw image. Used only to verify your identity when voting.</p>

            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div className="face-frame" style={{ marginBottom:16 }}>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: cameraReady ? "block" : "none",
                  }}
                />
                {!cameraReady && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", opacity:0.35 }}>
                    <Icon name="camera" size={74} color="var(--teal-light)" />
                  </div>
                )}
                {scanning && <div className="face-scan-line" />}
                {CORNER_STYLES.map((s, i) => <div key={i} className="face-corner" style={s} />)}
                {scanned && (
                  <div style={{ position:"absolute", inset:0, background:"rgba(255,102,153,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ background:"var(--teal)", borderRadius:"50%", width:56, height:56, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="check" size={28} color="white" />
                    </div>
                  </div>
                )}
              </div>
              <p style={{ fontSize:13, color:"var(--gray-500)", lineHeight:1.6 }}>
                {scanning ? "Analyzing facial features..." : scanned ? "Face registered successfully!" : scanStatus}
              </p>
              {cameraError && (
                <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 12px", color:"var(--red)", fontSize:12, lineHeight:1.5, marginTop:12 }}>
                  {cameraError}
                </div>
              )}
            </div>

            {!scanned ? (
              <>
                {!cameraReady && (
                  <button className="btn-primary" style={{ width:"100%", justifyContent:"center", marginBottom:10 }} onClick={startCamera} disabled={scanning}>
                    <Icon name="camera" size={16} /> Enable Camera
                  </button>
                )}
                {cameraReady && (
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={startCamera} disabled={scanning}>
                      Restart
                    </button>
                    <button className="btn-primary" style={{ flex:2, justifyContent:"center" }} onClick={startScan} disabled={scanning}>
                      {scanning
                        ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", animation:"spin 0.7s linear infinite" }} />
                        : <><Icon name="camera" size={16} /> Start Face Scan</>}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
              {submitError && (
                <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 12px", color:"var(--red)", fontSize:12, lineHeight:1.5, marginBottom:14 }}>
                  {submitError}
                </div>
              )}
              <button className="btn-primary" style={{ width:"100%", justifyContent:"center" }} onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", animation:"spin 0.7s linear infinite" }} />
                  : <>Submit Registration <Icon name="arrow" size={16} /></>}
              </button>
              </>
            )}

            <button onClick={() => setStep(0)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"var(--gray-400)", marginTop:12, display:"block", width:"100%", textAlign:"center" }}>Back</button>
          </div>
        )}

        {/* ── STEP 2: Done ── */}
        {step === 2 && (
          <div className="card scale-in" style={{ padding:"28px 24px", textAlign:"center" }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--green-light)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
              <Icon name="check" size={36} color="var(--green)" />
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"var(--navy)", marginBottom:8 }}>Registration Submitted!</h2>
            <p style={{ fontSize:14, color:"var(--gray-500)", lineHeight:1.7, marginBottom:20 }}>
              Your registration is now <strong>pending approval</strong> by the administrator. You will be able to log in once your account has been approved.
            </p>
            <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"var(--radius-sm)", padding:"12px 16px", marginBottom:24, display:"flex", gap:10, alignItems:"flex-start" }}>
              <Icon name="clock" size={16} color="var(--gold)" />
              <p style={{ fontSize:12, color:"var(--gray-600)", margin:0, lineHeight:1.5 }}>Approval is typically processed within 24 hours. Check back later or contact your department admin.</p>
            </div>
            <button className="btn-primary" style={{ width:"100%", justifyContent:"center" }} onClick={onDone}>
              Back to Sign In <Icon name="arrow" size={16} />
            </button>
          </div>
        )}

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:11, marginTop:16 }}>DCT Capstone Project 2025-2026</p>
      </div>
    </div>
  );
};

export default RegisterScreen;
