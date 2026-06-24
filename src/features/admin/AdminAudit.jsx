import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common";
import { api } from "../../lib/api";

const DEFAULT_FILTERS = {
  search: "",
  action: "",
  actor: "",
  department: "",
  date_from: "",
  date_to: "",
  limit: 100,
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

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map(log => log.action))).sort(),
    [logs],
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(logs.map(log => log.department).filter(Boolean))).sort(),
    [logs],
  );

  const loadLogs = async (nextFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      setLogs(await api.auditLogs(nextFilters));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(DEFAULT_FILTERS);
  }, []);

  const setFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const applyFilters = () => loadLogs(filters);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    loadLogs(DEFAULT_FILTERS);
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
    a.download = "pickpal_audit_log.csv";
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
          <Icon name="download" size={16} /> Export Log
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label className="label">Search</label>
            <input className="input-field" value={filters.search} onChange={event => setFilter("search", event.target.value)} placeholder="Actor, action, details, or IP" />
          </div>
          <div>
            <label className="label">Action</label>
            <select className="input-field" value={filters.action} onChange={event => setFilter("action", event.target.value)}>
              <option value="">All actions</option>
              {actionOptions.map(action => <option key={action} value={action}>{action}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input-field" value={filters.department} onChange={event => setFilter("department", event.target.value)}>
              <option value="">All departments</option>
              {departmentOptions.map(department => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 10, alignItems: "end" }}>
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
          <button className="btn-primary" style={{ padding: "10px 16px" }} onClick={applyFilters} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>Showing</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{logs.length}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>Action Types</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{actionOptions.length}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>Departments</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{departmentOptions.length}</div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading && <div style={{ padding: 28, textAlign: "center", color: "var(--gray-500)", fontSize: 14 }}>Loading audit logs...</div>}
        {error && <div style={{ padding: 20, color: "var(--red)", fontSize: 13 }}>{error}</div>}
        {!loading && !error && (
          <table>
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
    </div>
  );
};

export default AdminAudit;
