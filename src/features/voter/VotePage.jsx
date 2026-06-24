// src/features/voter/VotePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Avatar } from "../../components/common";
import { api } from "../../lib/api";
import ElectionPicker from "./ElectionPicker";

const CORNERS = [
  { top: 8, left: 8, borderWidth: "3px 0 0 3px" },
  { top: 8, right: 8, borderWidth: "3px 3px 0 0" },
  { bottom: 8, left: 8, borderWidth: "0 0 3px 3px" },
  { bottom: 8, right: 8, borderWidth: "0 3px 3px 0" },
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getErrorMessage = (error) => {
  if (!error) return "";

  const firstFieldError = error.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error.message || "Something went wrong. Please try again.";
};

const BallotFlow = ({ election, user, onBack, onVoted }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep] = useState("ballot");
  const [ballotElection, setBallotElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selections, setSelections] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanStatus, setScanStatus] = useState("Camera permission is required before verification.");
  const [detectorSupported, setDetectorSupported] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [toast, setToast] = useState(null);

  const positions = ballotElection?.ballot || [];
  const studentNumber = user?.studentNumber;
  const allSelected = positions.length > 0 && positions.every(position => selections[position.slug]);
  const selectedCount = useMemo(
    () => positions.filter(position => selections[position.slug]).length,
    [positions, selections],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setSelections({});
    setStep("ballot");
    setReceiptId(null);

    api.election(election.id)
      .then((result) => {
        if (!cancelled) setBallotElection(result);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [election.id]);

  useEffect(() => {
    if (step !== "face") {
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
    setSubmitError(null);
    setScanned(false);
    setDetectorSupported("FaceDetector" in window);
    setScanStatus("Starting camera...");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support camera access. Try Chrome, Edge, or another modern browser.");
      setScanStatus("Camera unavailable.");
      return;
    }

    try {
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
      setScanStatus("Center your face inside the frame, then start verification.");
    } catch (error) {
      setCameraError(error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access and try again."
        : "Could not start the camera. Check that no other app is using it.");
      setScanStatus("Camera unavailable.");
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSelect = (position, candidate) => {
    setSelections(current => ({ ...current, [position.slug]: candidate.id }));
    showToast(`${candidate.name} selected for ${position.name}`);
  };

  const runFaceScan = async () => {
    if (!cameraReady || scanning) return false;

    setScanning(true);
    setScanned(false);
    setSubmitError(null);
    setScanStatus(detectorSupported ? "Scanning for a face..." : "Scanning camera frame...");

    try {
      if ("FaceDetector" in window) {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const deadline = Date.now() + 7000;

        while (Date.now() < deadline) {
          const faces = await detector.detect(videoRef.current);

          if (faces.length > 0) {
            setScanned(true);
            setScanStatus("Face detected. Submitting your verified ballot...");
            return true;
          }

          await wait(350);
        }

        setSubmitError("No face was detected. Move closer, improve lighting, and try again.");
        setScanStatus("Face not detected.");
        return false;
      }

      await wait(1800);
      setScanned(true);
      setScanStatus("Camera scan complete. Submitting your verified ballot...");
      return true;
    } catch {
      setSubmitError("Face detection could not complete. Please try again.");
      setScanStatus("Scan failed.");
      return false;
    } finally {
      setScanning(false);
    }
  };

  const submitVote = async () => {
    if (!allSelected || scanning) return;

    if (!studentNumber) {
      setSubmitError("Your voter session is missing. Please sign out and sign in again.");
      return;
    }

    const faceVerified = await runFaceScan();

    if (!faceVerified) return;

    setScanning(true);
    setScanStatus("Submitting your verified ballot...");

    try {
      const result = await api.castVote({
        election_id: election.id,
        face_verified: true,
        selections,
      });

      setReceiptId(result.receipt_id);
      setStep("done");
      onVoted?.();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      setScanned(false);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="page-scroll">
      {toast && <div className="toast">{toast}</div>}

      {step === "ballot" && <>
        <div style={{ background: "var(--navy)", padding: "20px 20px 0" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            Back to Elections
          </button>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Ballot</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "white", marginBottom: 4 }}>{election.title}</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Select one candidate per position</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16 }}>
            <Icon name="shield" size={14} color="var(--teal-light)" />
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>Your choices are encrypted and anonymous</p>
          </div>
        </div>

        <div style={{ padding: "20px 16px" }}>
          {loading && (
            <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>
              Loading ballot...
            </div>
          )}

          {loadError && (
            <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13, lineHeight: 1.5 }}>
              Could not load this ballot. {getErrorMessage(loadError)}
            </div>
          )}

          {!loading && !loadError && positions.length === 0 && (
            <div className="card" style={{ padding: 20, color: "var(--gray-500)", fontSize: 13, lineHeight: 1.5 }}>
              This election does not have ballot positions yet.
            </div>
          )}

          {!loading && !loadError && positions.map((position, index) => {
            const selectedCandidateId = selections[position.slug];

            return (
              <div key={position.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: selectedCandidateId ? "var(--teal)" : "var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {selectedCandidateId ? <Icon name="check" size={14} color="white" /> : <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-500)" }}>{index + 1}</span>}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>{position.name}</h3>
                  {selectedCandidateId && <span className="badge badge-green" style={{ marginLeft: "auto" }}>Selected</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {position.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={`candidate-card ${selectedCandidateId === candidate.id ? "selected" : ""}`}
                      onClick={() => handleSelect(position, candidate)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt={candidate.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${selectedCandidateId === candidate.id ? "var(--teal)" : "var(--gray-100)"}` }} />
                        ) : (
                          <Avatar name={candidate.name} size={40} bg={selectedCandidateId === candidate.id ? "var(--teal)" : "var(--gray-300)"} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)" }}>{candidate.name}</div>
                          <div style={{ fontSize: 12, color: "var(--gray-400)" }}>
                            {[candidate.year_level, candidate.section].filter(Boolean).join(" - ") || "Tap to select"}
                          </div>
                        </div>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${selectedCandidateId === candidate.id ? "var(--teal)" : "var(--gray-200)"}`, background: selectedCandidateId === candidate.id ? "var(--teal)" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                          {selectedCandidateId === candidate.id && <Icon name="check" size={13} color="white" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {!loading && !loadError && (
            <>
              <button
                className={allSelected ? "btn-primary" : "btn-outline"}
                style={{ width: "100%", justifyContent: "center", background: allSelected ? "var(--teal)" : undefined, marginBottom: 12 }}
                onClick={() => allSelected ? setStep("review") : showToast("Please select all positions first")}
              >
                Review Ballot <Icon name="arrow" size={16} />
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--gray-400)" }}>
                {selectedCount} of {positions.length} positions selected
              </p>
            </>
          )}
        </div>
      </>}

      {step === "review" && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 6 }}>Review Your Ballot</h2>
            <p style={{ fontSize: 14, color: "var(--gray-500)" }}>Please review before submitting. This cannot be undone.</p>
          </div>
          <div className="card" style={{ padding: "8px 0", marginBottom: 24 }}>
            {positions.map((position, index) => {
              const candidate = position.candidates.find(item => item.id === selections[position.slug]);

              return (
                <div key={position.id} style={{ padding: "16px 20px", borderBottom: index < positions.length - 1 ? "1px solid var(--gray-100)" : "none", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check" size={18} color="var(--green)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{position.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", marginTop: 2 }}>{candidate?.name || "No candidate selected"}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: "#FEF3C7", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 24, display: "flex", gap: 10 }}>
            <Icon name="info" size={18} color="#92400E" />
            <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5, margin: 0 }}>Submitting will require facial verification. Your vote will be anonymous and cannot be changed.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-outline" onClick={() => setStep("ballot")} style={{ flex: 1, justifyContent: "center" }}>Edit</button>
            <button className="btn-primary" onClick={() => setStep("face")} style={{ flex: 2, justifyContent: "center" }}>
              Verify &amp; Submit <Icon name="camera" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "face" && (
        <div style={{ padding: "24px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "60vh", justifyContent: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 8 }}>Facial Verification</h2>
          <p style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 20 }}>Verify your identity to submit your vote</p>
          <div className="face-frame" style={{ marginBottom: 28 }}>
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
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}>
                <Icon name="camera" size={54} color="currentColor" />
              </div>
            )}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: cameraReady ? 0 : 0.2 }}>
              <Icon name="person" size={100} color="white" />
            </div>
            {scanning && <div className="face-scan-line" />}
            {scanned && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "var(--green)", borderRadius: "50%", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={32} color="white" />
                </div>
              </div>
            )}
            {CORNERS.map((style, index) => <div key={index} className="face-corner" style={style} />)}
          </div>
          <p style={{ fontSize: 14, color: scanned ? "var(--green)" : "var(--gray-500)", marginBottom: 8, fontWeight: scanned ? 700 : 500 }}>
            {scanned ? "Identity verified!" : scanStatus}
          </p>
          {!detectorSupported && cameraReady && (
            <p style={{ fontSize: 11, color: "var(--gray-400)", lineHeight: 1.5, maxWidth: 340, marginBottom: 16 }}>
              Browser face detection is not available here, so PickPal will verify using a live camera scan.
            </p>
          )}
          {cameraError && (
            <div className="card" style={{ padding: 14, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16, maxWidth: 340 }}>
              {cameraError}
            </div>
          )}
          {submitError && (
            <div className="card" style={{ padding: 14, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 20, maxWidth: 340 }}>
              {submitError}
            </div>
          )}
          {!scanning && !cameraReady && (
            <button className="btn-primary" onClick={startCamera}>
              <Icon name="camera" size={16} /> Enable Camera
            </button>
          )}
          {!scanning && cameraReady && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn-outline" onClick={startCamera} style={{ justifyContent: "center" }}>
                Restart Camera
              </button>
              <button className="btn-primary" onClick={submitVote} disabled={!allSelected}>
                <Icon name="camera" size={16} /> Scan &amp; Submit
              </button>
            </div>
          )}
          {scanning && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--teal)" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(13,148,136,0.3)", borderTopColor: "var(--teal)", animation: "spin 0.7s linear infinite" }} />
              <span style={{ fontWeight: 600 }}>Scanning...</span>
            </div>
          )}
        </div>
      )}

      {step === "done" && (
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px 100px", textAlign: "center" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, animation: "scaleIn 0.5s ease" }}>
            <Icon name="check" size={50} color="var(--green)" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--navy)", marginBottom: 10 }}>Vote Cast!</h1>
          <p style={{ fontSize: 16, color: "var(--gray-500)", marginBottom: 6 }}>Your vote has been recorded anonymously.</p>
          <p style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6, maxWidth: 280 }}>
            Thank you for participating in {election.title}. Results will be published after the election period.
          </p>
          <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius)", padding: "16px 20px", marginTop: 28, width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 4 }}>Receipt ID (anonymized)</div>
            <div style={{ fontFamily: "monospace", fontSize: 14, color: "var(--navy)", fontWeight: 600, letterSpacing: "0.1em" }}>
              #{receiptId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VotePage = ({ user, onVoted }) => {
  const [selectedElection, setSelected] = useState(null);

  if (selectedElection) {
    return <BallotFlow election={selectedElection} user={user} onBack={() => setSelected(null)} onVoted={onVoted} />;
  }

  return <ElectionPicker mode="vote" onSelect={setSelected} user={user} />;
};

export default VotePage;
