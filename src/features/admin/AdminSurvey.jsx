import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

const ANSWER_TYPES = ["Multiple choice", "Yes / No", "Scale (1-5)", "Short text"];
const BLANK_SURVEY = { title: "", description: "", electionId: "", questions: [], published: false, active: true };
const BLANK_Q = { id: null, text: "", type: "Multiple choice", options: ["", ""], required: false };

const typeDefaults = {
  "Multiple choice": ["", ""],
  "Yes / No": ["Yes", "No"],
  "Scale (1-5)": ["1", "2", "3", "4", "5"],
  "Short text": [],
};

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Survey request failed.";
};

const normalizeSurvey = (survey) => ({
  id: survey.id,
  title: survey.title,
  description: survey.description || "",
  electionId: survey.election_id || "",
  electionTitle: survey.election_title || "",
  questions: survey.questions || [],
  published: Boolean(survey.published),
  active: Boolean(survey.active),
  responseCount: survey.response_count || 0,
});

const toPayload = (survey) => ({
  title: survey.title.trim(),
  description: survey.description?.trim() || null,
  election_id: survey.electionId || null,
  published: Boolean(survey.published),
  active: Boolean(survey.active),
  questions: (survey.questions || []).map((question) => ({
    text: question.text.trim(),
    type: question.type,
    options: question.type === "Short text"
      ? []
      : (question.options || []).map(option => option.trim()).filter(Boolean),
    required: Boolean(question.required),
  })),
});

const QuestionForm = ({ initial, onSave, onCancel }) => {
  const [question, setQuestion] = useState(initial ? { ...initial } : { ...BLANK_Q });
  const set = (key, value) => setQuestion(current => ({ ...current, [key]: value }));
  const options = question.options || [];
  const valid = question.text.trim()
    && (question.type === "Short text" || options.filter(option => option.trim()).length >= 2);

  const setType = (type) => {
    setQuestion(current => ({
      ...current,
      type,
      options: current.type === type ? current.options : typeDefaults[type],
    }));
  };

  const setOption = (index, value) => {
    const next = [...options];
    next[index] = value;
    set("options", next);
  };

  return (
    <div className="overlay-centered" onClick={event => event.target === event.currentTarget && onCancel()}>
      <div className="modal-centered">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)" }}>{initial ? "Edit Question" : "Add Question"}</h2>
          <button onClick={onCancel} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--gray-500)" }}>x</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Question Text</label>
          <textarea className="input-field" rows={2} value={question.text} onChange={event => set("text", event.target.value)} style={{ resize: "vertical" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Answer Type</label>
          <select className="input-field" value={question.type} onChange={event => setType(event.target.value)}>
            {ANSWER_TYPES.map(type => <option key={type}>{type}</option>)}
          </select>
        </div>

        {question.type !== "Short text" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label className="label" style={{ margin: 0 }}>Options</label>
              <button onClick={() => set("options", [...options, ""])} style={{ background: "none", border: "none", color: "var(--teal)", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                Add option
              </button>
            </div>
            {options.map((option, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input className="input-field" value={option} onChange={event => setOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
                {options.length > 2 && (
                  <button onClick={() => set("options", options.filter((_, itemIndex) => itemIndex !== index))} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer", fontWeight: 700 }}>x</button>
                )}
              </div>
            ))}
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid var(--gray-100)", marginBottom: 20 }}>
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>Required</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--gray-500)" }}>Respondents must answer this question.</span>
          </span>
          <input type="checkbox" checked={question.required} onChange={event => set("required", event.target.checked)} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, justifyContent: "center", opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={() => onSave(question)}>
            {initial ? "Save Changes" : <><Icon name="plus" size={14} /> Add Question</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const SurveyForm = ({ elections, initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_SURVEY });
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const valid = form.title.trim();

  return (
    <div className="overlay-centered" onClick={event => event.target === event.currentTarget && onCancel()}>
      <div className="modal-centered">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)" }}>{initial ? "Edit Survey" : "Create Survey"}</h2>
          <button onClick={onCancel} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--gray-500)" }}>x</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Survey Title</label>
          <input className="input-field" value={form.title} onChange={event => set("title", event.target.value)} placeholder="e.g. Student Feedback Survey" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Description</label>
          <textarea className="input-field" rows={3} value={form.description} onChange={event => set("description", event.target.value)} style={{ resize: "vertical" }} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label className="label">Optional Election Context</label>
          <select className="input-field" value={form.electionId} onChange={event => set("electionId", event.target.value)}>
            <option value="">No linked election</option>
            {elections.map(election => <option key={election.id} value={election.id}>{election.title}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, justifyContent: "center", opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={() => onSave(form)}>
            {initial ? "Save Changes" : <><Icon name="plus" size={14} /> Create Survey</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const SurveyEditor = ({ survey, elections, onBack, onSaved, onDeleted }) => {
  const [draft, setDraft] = useState(survey);
  const [showMeta, setShowMeta] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const questionsLocked = draft.responseCount > 0;

  useEffect(() => setDraft(survey), [survey]);

  const contextTitle = draft.electionId
    ? elections.find(election => election.id === draft.electionId)?.title || draft.electionTitle || "Linked election"
    : "General feedback";

  const saveSurvey = async (patch = {}) => {
    const next = { ...draft, ...patch };
    setSaving(true);
    setError("");

    try {
      const saved = normalizeSurvey(await api.updateSurvey(next.id, toPayload(next)));
      setDraft(saved);
      onSaved(saved);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  const saveQuestion = (question) => {
    const questions = editingQuestion
      ? draft.questions.map(item => item.id === editingQuestion.id ? { ...question, id: editingQuestion.id } : item)
      : [...draft.questions, { ...question, id: `local-${Date.now()}` }];

    setDraft(current => ({ ...current, questions }));
    setEditingQuestion(null);
    setShowQuestion(false);
  };

  const deleteSurvey = async () => {
    setSaving(true);
    setError("");

    try {
      await api.deleteSurvey(draft.id);
      onDeleted(draft.id);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = (index, direction) => {
    const next = [...draft.questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(current => ({ ...current, questions: next }));
  };

  return (
    <div className="page-scroll-admin">
      {showMeta && (
        <SurveyForm
          elections={elections}
          initial={draft}
          onCancel={() => setShowMeta(false)}
          onSave={(form) => {
            setDraft(current => ({ ...current, title: form.title, description: form.description, electionId: form.electionId }));
            setShowMeta(false);
          }}
        />
      )}
      {showQuestion && (
        <QuestionForm
          initial={editingQuestion}
          onCancel={() => { setEditingQuestion(null); setShowQuestion(false); }}
          onSave={saveQuestion}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: 13, fontWeight: 700, marginBottom: 8, padding: 0 }}>
            Back to surveys
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--navy)", marginBottom: 4, lineHeight: 1.2 }}>{draft.title}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={draft.published ? "badge badge-green" : "badge badge-gray"} style={{ fontSize: 11 }}>{draft.published ? "Published" : "Draft"}</span>
            <span className={draft.active ? "badge badge-blue" : "badge badge-gray"} style={{ fontSize: 11 }}>{draft.active ? "Active" : "Inactive"}</span>
            <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{contextTitle}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowMeta(true)}>Edit Details</button>
          <button className="btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => saveSurvey({ active: !draft.active })} disabled={saving}>{draft.active ? "Deactivate" : "Activate"}</button>
          <button className={draft.published ? "btn-outline" : "btn-primary"} style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => saveSurvey({ published: !draft.published })} disabled={saving || (!draft.published && draft.questions.length === 0)}>
            {draft.published ? "Unpublish" : "Publish"}
          </button>
          <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => saveSurvey()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6, flex: 1, margin: 0 }}>{draft.description || "No description yet."}</p>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)" }}>{draft.questions.length}</div>
              <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Questions</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)" }}>{draft.responseCount}</div>
              <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Responses</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--navy)" }}>Questions</h2>
          <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13, opacity: questionsLocked ? 0.55 : 1 }} disabled={questionsLocked} onClick={() => { setEditingQuestion(null); setShowQuestion(true); }}>
          <Icon name="plus" size={14} /> Add Question
        </button>
      </div>

      {questionsLocked && (
        <div className="card" style={{ padding: 14, color: "var(--gray-600)", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
          Question editing is locked because this survey already has submitted responses. You can still update the title, description, publish state, and active state.
        </div>
      )}

      {draft.questions.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="survey" size={38} color="var(--gray-300)" />
          <p style={{ fontSize: 14, color: "var(--gray-400)", marginTop: 14, marginBottom: 20 }}>Add at least one question before publishing.</p>
          <button className="btn-primary" onClick={() => setShowQuestion(true)}><Icon name="plus" size={14} /> Add First Question</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {draft.questions.map((question, index) => (
          <div key={question.id} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <button onClick={() => moveQuestion(index, -1)} disabled={index === 0 || questionsLocked} style={{ background: "none", border: "none", cursor: questionsLocked ? "not-allowed" : "pointer", color: index === 0 || questionsLocked ? "var(--gray-200)" : "var(--gray-400)" }}>^</button>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--teal)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{index + 1}</div>
                <button onClick={() => moveQuestion(index, 1)} disabled={index === draft.questions.length - 1 || questionsLocked} style={{ background: "none", border: "none", cursor: questionsLocked ? "not-allowed" : "pointer", color: index === draft.questions.length - 1 || questionsLocked ? "var(--gray-200)" : "var(--gray-400)" }}>v</button>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", lineHeight: 1.4, margin: 0 }}>{question.text}</p>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {question.required && <span className="badge badge-blue" style={{ fontSize: 10 }}>Required</span>}
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{question.type}</span>
                  </div>
                </div>
                {question.type !== "Short text" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {(question.options || []).filter(Boolean).map((option, optionIndex) => (
                      <span key={optionIndex} style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", background: "var(--gray-100)", fontSize: 12, color: "var(--gray-600)" }}>{option}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 12, opacity: questionsLocked ? 0.55 : 1 }} disabled={questionsLocked} onClick={() => { setEditingQuestion(question); setShowQuestion(true); }}>Edit</button>
                  <button disabled={questionsLocked} style={{ padding: "6px 12px", fontSize: 12, borderRadius: "var(--radius-full)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: questionsLocked ? "var(--gray-400)" : "var(--red)", cursor: questionsLocked ? "not-allowed" : "pointer", fontWeight: 700 }} onClick={() => setDraft(current => ({ ...current, questions: current.questions.filter(item => item.id !== question.id) }))}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={deleteSurvey} disabled={saving || draft.responseCount > 0} style={{ padding: "8px 14px", fontSize: 13, borderRadius: "var(--radius-full)", border: "1px solid rgba(239,68,68,0.25)", background: "white", color: draft.responseCount > 0 ? "var(--gray-400)" : "var(--red)", cursor: draft.responseCount > 0 ? "not-allowed" : "pointer", fontWeight: 700 }}>
        Delete Survey
      </button>
    </div>
  );
};

const SurveyList = ({ surveys, loading, error, onCreate, onSelect }) => (
  <div className="page-scroll-admin">
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Survey Manager</h1>
        <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Create optional surveys for feedback, needs assessment, and student information gathering.</p>
      </div>
      <button className="btn-primary" onClick={onCreate} style={{ flexShrink: 0 }}><Icon name="plus" size={16} /> Create Survey</button>
    </div>

    {error && <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
    {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading surveys...</div>}

    {!loading && surveys.length === 0 && (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <Icon name="survey" size={42} color="var(--gray-300)" />
        <p style={{ fontSize: 15, color: "var(--gray-400)", marginTop: 16, marginBottom: 20 }}>No surveys yet. Create your first survey to get started.</p>
        <button className="btn-primary" onClick={onCreate}><Icon name="plus" size={15} /> Create Survey</button>
      </div>
    )}

    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {surveys.map(survey => (
        <button key={survey.id} onClick={() => onSelect(survey)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "white", border: "1px solid var(--gray-100)", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: survey.published ? "rgba(13,148,136,0.1)" : "var(--gray-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="survey" size={22} color={survey.published ? "var(--teal)" : "var(--gray-300)"} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 5 }}>{survey.title}</div>
              {survey.description && <p style={{ fontSize: 12, color: "var(--gray-500)", margin: "0 0 6px", lineHeight: 1.4, maxWidth: 460 }}>{survey.description}</p>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className={survey.published ? "badge badge-green" : "badge badge-gray"} style={{ fontSize: 10 }}>{survey.published ? "Published" : "Draft"}</span>
                {survey.active && <span className="badge badge-blue" style={{ fontSize: 10 }}>Active</span>}
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{survey.electionTitle || "General feedback"}</span>
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{survey.questions.length} questions</span>
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{survey.responseCount} responses</span>
              </div>
            </div>
          </div>
          <Icon name="arrow" size={18} color="var(--gray-300)" />
        </button>
      ))}
    </div>
  </div>
);

const AdminSurvey = () => {
  const [surveys, setSurveys] = useState([]);
  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    Promise.all([api.surveys(), api.elections()])
      .then(([surveyData, electionData]) => {
        if (cancelled) return;
        setSurveys(surveyData.map(normalizeSurvey));
        setElections(electionData.map(election => ({ id: election.id, title: election.title })));
      })
      .catch(apiError => {
        if (!cancelled) setError(getErrorMessage(apiError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => surveys.find(survey => survey.id === selectedId),
    [surveys, selectedId],
  );

  const saveLocal = (saved) => {
    setSurveys(current => current.map(survey => survey.id === saved.id ? saved : survey));
    setSelectedId(saved.id);
  };

  const createSurvey = async (form) => {
    setCreating(true);
    setError("");

    try {
      const saved = normalizeSurvey(await api.createSurvey(toPayload({ ...form, questions: [] })));
      setSurveys(current => [saved, ...current]);
      setShowCreate(false);
      setSelectedId(saved.id);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <SurveyEditor
        survey={selected}
        elections={elections}
        onBack={() => setSelectedId(null)}
        onSaved={saveLocal}
        onDeleted={(surveyId) => {
          setSurveys(current => current.filter(survey => survey.id !== surveyId));
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <>
      {showCreate && (
        <SurveyForm
          elections={elections}
          onSave={createSurvey}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {creating && <div className="toast">Creating survey...</div>}
      <SurveyList surveys={surveys} loading={loading} error={error} onCreate={() => setShowCreate(true)} onSelect={survey => setSelectedId(survey.id)} />
    </>
  );
};

export default AdminSurvey;
