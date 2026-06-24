import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Could not load analytics.";
};

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "") || "survey";

const AnalyticsQuestion = ({ question }) => {
  const isText = question.type === "Short text";

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>{question.text}</h3>
          <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0 }}>{question.total} answers</p>
        </div>
        <span className="badge badge-gray" style={{ fontSize: 10, height: "fit-content" }}>{question.type}</span>
      </div>

      {question.total === 0 && (
        <p style={{ fontSize: 13, color: "var(--gray-400)", margin: 0 }}>No answers yet.</p>
      )}

      {!isText && question.answers.map(answer => (
        <div key={answer.label} className="chart-bar-wrap" style={{ marginBottom: 12 }}>
          <div style={{ width: 120, fontSize: 12, color: "var(--gray-600)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{answer.label}</div>
          <div className="chart-bar-bg"><div className="chart-bar-fill" style={{ width: `${answer.pct}%` }} /></div>
          <div className="chart-val" style={{ fontSize: 12 }}>{answer.pct}%</div>
        </div>
      ))}

      {isText && question.answers.slice(0, 6).map(answer => (
        <div key={answer.label} style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--gray-50)", color: "var(--gray-600)", fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
          {answer.label}
        </div>
      ))}
    </div>
  );
};

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    api.surveyAnalytics()
      .then((data) => {
        if (cancelled) return;
        setAnalytics(data);
        setSelectedSurveyId(data.surveys?.[0]?.id || "");
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

  const surveys = analytics?.surveys || [];
  const selectedSurvey = useMemo(
    () => surveys.find(survey => survey.id === selectedSurveyId) || surveys[0],
    [surveys, selectedSurveyId],
  );
  const answeredQuestions = selectedSurvey?.questions?.filter(question => question.total > 0).length || 0;

  const exportResponses = async () => {
    if (!selectedSurvey) return;

    setExporting(true);
    setError("");

    try {
      const data = await api.surveyResponses(selectedSurvey.id);
      const header = [
        "response_id",
        "submitted_at",
        "student_number",
        ...data.questions.map(question => question.text),
      ];
      const rows = data.responses.map(response => {
        const answerMap = new Map(response.answers.map(answer => [answer.question_id, answer.answer]));
        return [
          response.id,
          response.submitted_at,
          response.student_number || "anonymous",
          ...data.questions.map(question => answerMap.get(question.id) || ""),
        ].map(csvValue).join(",");
      });
      const blob = new Blob([[header.map(csvValue).join(","), ...rows].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(data.survey.title)}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Survey responses exported");
      setTimeout(() => setToast(null), 2500);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast">{toast}</div>}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Analytics &amp; Survey</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>Survey insights are calculated from submitted responses.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {surveys.length > 0 && (
            <select className="input-field" value={selectedSurvey?.id || ""} onChange={event => setSelectedSurveyId(event.target.value)} style={{ maxWidth: 300 }}>
              {surveys.map(survey => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
            </select>
          )}
          {selectedSurvey && (
            <button className="btn-outline" onClick={exportResponses} disabled={exporting || selectedSurvey.response_count === 0}>
              <Icon name="download" size={16} /> {exporting ? "Exporting..." : "Export Responses"}
            </button>
          )}
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading analytics...</div>}
      {error && <div className="card" style={{ padding: 16, color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {!loading && !error && surveys.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Icon name="survey" size={42} color="var(--gray-300)" />
          <p style={{ fontSize: 15, color: "var(--gray-400)", marginTop: 16 }}>No surveys are available yet.</p>
        </div>
      )}

      {!loading && !error && selectedSurvey && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 8 }}>All Survey Responses</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)" }}>{analytics.total_responses}</div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 8 }}>Selected Survey Responses</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)" }}>{selectedSurvey.response_count}</div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 8 }}>Questions With Answers</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)" }}>{answeredQuestions}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 4 }}>{selectedSurvey.title}</h2>
            <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>{selectedSurvey.response_count} submitted responses</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {selectedSurvey.questions.map(question => <AnalyticsQuestion key={question.id} question={question} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
