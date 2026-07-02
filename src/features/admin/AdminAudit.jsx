import { useEffect, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

const DEFAULT_FILTERS = {
  search: "",
  action: "",
  actor: "",
  department: "",
  date_from: "",
  date_to: "",
  page: 1,
  per_page: 25,
};

const formatLogTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors
    ? Object.values(error.errors).flat().find(Boolean)
    : null;

  return firstFieldError || error?.message || "Could not load audit logs.";
};

const AdminAudit = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });

  const loadLogs = async (nextFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const result = await api.auditLogs(nextFilters);
      setLogs(result.data || []);
      setPagination({
        current_page: result.current_page || 1,
        last_page: result.last_page || 1,
        total: result.total || 0,
        from: result.from || 0,
        to: result.to || 0,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadLogs(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const setFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleExportLog = () => {
    const header = "time,department,action,actor,ip_address,details";
    const csvRows = logs.map(log => [
      formatLogTime(log.occurred_at),
      log.department || "",
      log.action,
      log.actor,
      log.ip_address || "",
      log.details || "",
    ].map(csvValue).join(","));
    const blob = new Blob([[header, ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pickpal_audit_log_page_${pagination.current_page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Audit log exported");
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast">{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>Review backend activity by action, actor, department, and date.</p>
        </div>
        <button className="btn-outline" onClick={handleExportLog} disabled={loading || Boolean(error) || logs.length === 0}>
          <Icon name="download" size={16} /> Export Page
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <div>
            <label className="label">Search</label>
            <input className="input-field" value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="Actor, action, or details" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label className="label">Actor</label>
            <input className="input-field" value={filters.actor} onChange={event => setFilter("actor", event.target.value)} placeholder="admin or student no." />
          </div>
          <div>
            <label className="label">From</label>
            <input className="input-field" type="date" value={filters.date_from} onChange={event => setFilter("date_from", event.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input-field" type="date" value={filters.date_to} onChange={event => setFilter("date_to", event.target.value)} min={filters.date_from || undefined} />
          </div>
          <button className="btn-outline" style={{ padding: "10px 16px" }} onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>Total Logs</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{pagination.total}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>Page</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{pagination.current_page} / {pagination.last_page}</div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading && logs.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading audit logs...</div>}
        {error && <div style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>{error}</div>}
        {!error && (!loading || logs.length > 0) && (
          <table style={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.15s" }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Department</th>
                <th>Action</th>
                <th>Actor</th>
                <th>IP</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", padding: "28px 0" }}>No audit logs match your filters.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--gray-400)", whiteSpace: "nowrap" }}>{formatLogTime(log.occurred_at)}</td>
                  <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{log.department || "-"}</td>
                  <td style={{ fontWeight: 700, color: "var(--navy)" }}>{log.action}</td>
                  <td style={{ fontSize: 13, color: "var(--gray-500)" }}>{log.actor}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--gray-400)" }}>{log.ip_address || "-"}</td>
                  <td style={{ fontSize: 13, color: "var(--gray-500)", lineHeight: 1.45 }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!error && pagination.last_page > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:16 }}>
          <button className="btn-outline" style={{ padding:"8px 12px", fontSize:12 }} disabled={loading || pagination.current_page <= 1} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}><Icon name="back" size={13} /> Previous</button>
          <span style={{ fontSize:12, color:"var(--gray-500)" }}>Page {pagination.current_page} of {pagination.last_page}</span>
          <button className="btn-outline" style={{ padding:"8px 12px", fontSize:12 }} disabled={loading || pagination.current_page >= pagination.last_page} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>Next <Icon name="arrow" size={13} /></button>
        </div>
      )}
    </div>
  );
};

export default AdminAudit;
