// src/features/voter/SurveyScreen.jsx
// Reads published surveys from the Laravel API.
// Surveys are supplementary feedback/data-gathering tools and are not required for voting.
import { useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";
import { useApiResource } from "../../hooks/useApiResource";

// ── Survey list landing ───────────────────────────────────────────────────────
const SurveyList = ({ surveys, completedIds, onSelect }) => (
  <div className="page-scroll">
    <div style={{ background: "var(--navy)", padding: "24px 20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Icon name="survey" size={20} color="var(--teal-light)" />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>Surveys</h2>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Optional feedback and information forms from your department administrators.</p>
    </div>

    <div style={{ padding: "16px 16px 20px" }}>
      {surveys.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="survey" size={38} color="var(--gray-300)" />
          <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14 }}>No surveys available right now. Check back later.</p>
        </div>
      )}

      {surveys.map(sv => {
        const done = completedIds.includes(sv.id);
        return (
          <div key={sv.id} className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
            <div style={{ height: 4, background: done ? "linear-gradient(90deg, var(--green), var(--teal))" : "linear-gradient(90deg, var(--teal), var(--teal-light))" }} />
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    {done
                      ? <span className="badge badge-green" style={{ fontSize: 10 }}>Completed</span>
                      : <span className="badge badge-blue"  style={{ fontSize: 10 }}>Available</span>}
                    <span style={{ fontSize: 11, color: "var(--gray-400)" }}>{sv.questions.length} questions - about {Math.ceil(sv.questions.length * 0.4)} min</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--navy)", marginBottom: 4, lineHeight: 1.3 }}>{sv.title}</h3>
                  {sv.description && <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0, lineHeight: 1.5 }}>{sv.description}</p>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, marginTop: 8 }}>
                <Icon name="lock" size={12} color="var(--gray-400)" />
                <span style={{ fontSize: 11, color: "var(--gray-400)" }}>Anonymous - optional - responses help improve student services</span>
              </div>

              <button
                className={done ? "btn-outline" : "btn-primary"}
                style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                onClick={() => onSelect(sv)}
              >
                {done ? "Retake Survey" : <><Icon name="arrow" size={14} /> Start Survey</>}
              </button>
            </div>
          </div>
        );
      })}

      {/* Info card */}
      <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "14px 16px", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="shield" size={15} color="var(--teal)" />
          <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0, lineHeight: 1.6 }}>
            Surveys are optional supplementary forms. They do not affect your ability to vote, and responses are kept separate from ballots.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ── Survey flow ───────────────────────────────────────────────────────────────
const SurveyFlow = ({ survey, onComplete, onCancel, saving, error }) => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [anonymous, setAnonymous] = useState(true);
  const q        = survey.questions[current];
  const progress = ((current + 1) / survey.questions.length) * 100;

  return (
    <div className="page-scroll">
      <div style={{ background: "var(--navy)", padding: "20px 20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{survey.title}</p>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "white" }}></span>
          </div>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Save &amp; Exit
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Question {current + 1} of {survey.questions.length}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal-light)" }}>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
          <Icon name="lock" size={11} /> Responses are separate from ballots
        </p>
      </div>

      <div style={{ padding: "22px 16px" }}>
        <label className="card" style={{ padding: 14, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>Submit anonymously</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>
              {anonymous ? "Your name will not be attached to this response." : "Your response will be linked to your voter account."}
            </span>
          </span>
          <input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} />
        </label>
        <div className="card scale-in" style={{ padding: 22, marginBottom: 18 }} key={current}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", lineHeight: 1.5, marginBottom: 18 }}>{q.text}</p>

          {q.type === "Short text" || q.type === "short_text" ? (
            <textarea className="input-field" rows={3} placeholder="Type your answer here..."
              value={answers[q.id] || ""}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              style={{ resize: "vertical" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, i) => {
                const sel = answers[q.id] === i;
                return (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))} style={{
                    padding: "13px 16px", borderRadius: "var(--radius-sm)",
                    border: `2px solid ${sel ? "var(--teal)" : "var(--gray-200)"}`,
                    background: sel ? "rgba(255,102,153,0.06)" : "white",
                    color: sel ? "var(--teal)" : "var(--gray-700)",
                    fontWeight: sel ? 600 : 400, fontSize: 14, textAlign: "left",
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${sel ? "var(--teal)" : "var(--gray-300)"}`, background: sel ? "var(--teal)" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {sel && <Icon name="check" size={11} color="white" />}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => current < survey.questions.length - 1 ? setCurrent(c => c + 1) : onComplete(answers, anonymous)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--gray-400)", marginTop: 12, display: "block", width: "100%", textAlign: "center" }}>
            Skip this question
          </button>
        </div>

        {error && (
          <div className="card" style={{ padding: 14, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {current > 0 && <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setCurrent(c => c - 1)}>Back</button>}
          {current < survey.questions.length - 1
            ? <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setCurrent(c => c + 1)} disabled={answers[q.id] === undefined && q.required}>
                Next <Icon name="arrow" size={15} />
              </button>
            : <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onComplete(answers, anonymous)} disabled={saving}>
                {saving
                  ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                  : <>Submit <Icon name="check" size={15} /></>}
              </button>
          }
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--gray-400)", marginTop: 10 }}>
          {Object.keys(answers).length} of {survey.questions.length} answered
        </p>
      </div>
    </div>
  );
};

// ── Thank you ─────────────────────────────────────────────────────────────────
const ThankYou = ({ survey, onReturn }) => (
  <div className="page-scroll">
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, animation: "scaleIn 0.4s ease" }}>
        <Icon name="check" size={40} color="var(--green)" />
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 8 }}>Thank you!</h2>
      <p style={{ fontSize: 14, color: "var(--gray-500)", lineHeight: 1.7, maxWidth: 280, marginBottom: 8 }}>
        Your response to <strong>{survey.title}</strong> has been recorded.
      </p>
      <p style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
        Your feedback helps administrators improve student services and future activities.
      </p>
      <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius)", padding: "12px 18px", marginBottom: 28, maxWidth: 300 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="lock" size={13} color="var(--teal)" />
          <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0, lineHeight: 1.5 }}>Your answers are not linked to your ballot.</p>
        </div>
      </div>
      <button className="btn-primary" style={{ justifyContent: "center" }} onClick={onReturn}>
        Back to Surveys <Icon name="arrow" size={15} />
      </button>
    </div>
  </div>
);

// ── Root ──────────────────────────────────────────────────────────────────────
const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Could not submit survey response.";
};

const SurveyScreen = ({ user, onComplete, surveyDone }) => {
  const [view, setView]         = useState("list");   // "list" | "flow" | "done"
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { data, loading, error } = useApiResource(api.surveys, []);
  const publishedSurveys = (data || []).filter(s => s.published && s.active);

  const handleSelect = (sv) => {
    setActiveSurvey(sv);
    setSubmitError("");
    setView("flow");
  };

  const handleComplete = async (answers, anonymous = true) => {
    setSaving(true);
    setSubmitError("");

    try {
      await api.submitSurveyResponse(activeSurvey.id, {
        answers,
        anonymous,
      });

      setCompletedIds(prev => [...new Set([...prev, activeSurvey.id])]);
      setView("done");
      onComplete?.();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (view === "flow")  return <SurveyFlow survey={activeSurvey} onComplete={handleComplete} onCancel={() => setView("list")} saving={saving} error={submitError} />;
  if (view === "done")  return <ThankYou survey={activeSurvey} onReturn={() => setView("list")} />;
  if (loading) {
    return (
      <div className="page-scroll">
        <div style={{ background: "var(--navy)", padding: "24px 20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>Surveys</h2>
        </div>
        <div style={{ padding: 16 }}>
          <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading surveys...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-scroll">
        <div style={{ background: "var(--navy)", padding: "24px 20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "white" }}>Surveys</h2>
        </div>
        <div style={{ padding: 16 }}>
          <div className="card" style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>Could not load surveys from the Laravel API.</div>
        </div>
      </div>
    );
  }
  return <SurveyList surveys={publishedSurveys} completedIds={completedIds} onSelect={handleSelect} />;
};

export default SurveyScreen;
