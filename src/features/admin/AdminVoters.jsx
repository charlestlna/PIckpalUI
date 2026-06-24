// src/features/admin/AdminVoters.jsx
import { useEffect, useRef, useState } from "react";
import { Avatar, Icon } from "../../components/common";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/api";

const REG_STATUS = {
  approved: { label: "Approved", badgeClass: "badge-green", color: "var(--green)" },
  pending: { label: "Pending", badgeClass: "badge-gold", color: "var(--gold)" },
  rejected: { label: "Rejected", badgeClass: "badge-red", color: "var(--red)" },
};

const OFFICIAL_STATUS = {
  matched: { label: "Matched", badgeClass: "badge-green" },
  mismatch: { label: "Mismatch", badgeClass: "badge-gold" },
  not_found: { label: "Not found", badgeClass: "badge-red" },
};

const mapBackendVoter = (voter) => ({
  dbId: voter.id,
  id: voter.student_number,
  firstName: voter.first_name,
  middleName: voter.middle_name || "",
  lastName: voter.last_name,
  dept: voter.department,
  year: voter.year_level?.replace(" Year", "") || "",
  section: voter.section,
  email: voter.email,
  regStatus: voter.registration_status,
  officialMatch: voter.official_match || { status: "not_found", label: "Not found", mismatches: [], warnings: [], official: null },
  voted: voter.voted,
});

const mapOfficialStudent = (student) => ({
  id: student.student_number,
  firstName: student.first_name,
  middleName: student.middle_name || "",
  lastName: student.last_name,
  dept: student.department,
  year: student.year_level?.replace(" Year", "") || "",
  section: student.section || "",
  email: student.email || "",
});

const getErrorMessage = (error) => {
  const firstFieldError = error?.errors ? Object.values(error.errors).flat().find(Boolean) : null;
  return firstFieldError || error?.message || "Request failed.";
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const VoterDetailModal = ({ voter, onClose, onApprove, onReject }) => {
  const fullName = [voter.firstName, voter.middleName, voter.lastName].filter(Boolean).join(" ");
  const regCfg = REG_STATUS[voter.regStatus];
  const officialCfg = OFFICIAL_STATUS[voter.officialMatch?.status] || OFFICIAL_STATUS.not_found;
  const mismatchText = voter.officialMatch?.mismatches?.length
    ? `Blocks approval: ${voter.officialMatch.mismatches.join(", ")}`
    : voter.officialMatch?.warnings?.length
      ? `Notes only: ${voter.officialMatch.warnings.join(", ")}`
      : "No mismatches";

  return (
    <div className="overlay-centered" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-centered">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={fullName} size={50} bg={voter.regStatus === "approved" ? "var(--teal)" : "var(--gray-300)"} />
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--navy)", lineHeight: 1.2 }}>{fullName}</h2>
              <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{voter.id} - {voter.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 14, color: "var(--gray-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span className={`badge ${regCfg.badgeClass}`}>{regCfg.label}</span>
          <span className={`badge ${officialCfg.badgeClass}`}>Official: {officialCfg.label}</span>
          <span className={`badge ${voter.voted ? "badge-green" : "badge-gray"}`}>{voter.voted ? "Voted" : "Not voted"}</span>
          <span className="badge badge-blue">{voter.dept}</span>
        </div>

        <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
          {[
            ["Student Number", voter.id],
            ["First Name", voter.firstName],
            ["Middle Name", voter.middleName || "-"],
            ["Last Name", voter.lastName],
            ["Email", voter.email],
            ["Department", voter.dept],
            ["Year Level", `${voter.year} Year`],
            ["Section", voter.section],
            ["Reg. Status", regCfg.label],
            ["Official List", officialCfg.label],
            ["Official Notes", mismatchText],
            ["Voting Status", voter.voted ? "Has voted" : "Pending"],
          ].map(([key, value], index, arr) => (
            <div key={key} style={{ padding: "11px 18px", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", borderBottom: index < arr.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
              <span style={{ fontSize: 13, color: "var(--gray-500)", fontWeight: 500 }}>{key}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: key === "Reg. Status" ? regCfg.color : "var(--navy)", textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>

        {voter.regStatus === "pending" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button className="btn-danger" style={{ flex: 1, justifyContent: "center", padding: "10px" }} onClick={() => { onReject(voter.id); onClose(); }}>
              <Icon name="lock" size={14} /> Reject
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2, justifyContent: "center", padding: "10px" }}
              title="Approve registration"
              onClick={() => { onApprove(voter.id); onClose(); }}
            >
              <Icon name="check" size={14} /> Approve Registration
            </button>
          </div>
        )}
        {voter.regStatus === "approved" && (
          <button className="btn-danger" style={{ width: "100%", justifyContent: "center", padding: "10px", marginBottom: 12, background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1.5px solid rgba(239,68,68,0.3)" }} onClick={() => { onReject(voter.id); onClose(); }}>
            Revoke Approval
          </button>
        )}
        {voter.regStatus === "rejected" && (
          <button
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "10px", marginBottom: 12 }}
            title="Re-approve registration"
            onClick={() => { onApprove(voter.id); onClose(); }}
          >
            <Icon name="check" size={14} /> Re-approve
          </button>
        )}

        <button className="btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const AdminVoters = () => {
  const { data, loading, error } = useApiResource(api.voters, []);
  const [voters, setVoters] = useState([]);
  const [officialStudents, setOfficialStudents] = useState([]);
  const [officialLoading, setOfficialLoading] = useState(true);
  const [officialError, setOfficialError] = useState("");
  const [search, setSearch] = useState("");
  const [regFilter, setRegFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [officialFilter, setOfficialFilter] = useState("All");
  const [voteFilter, setVoteFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    setVoters(data.map(mapBackendVoter));
  }, [data]);

  const loadOfficialStudents = async () => {
    setOfficialLoading(true);
    setOfficialError("");

    try {
      const records = await api.officialStudents();
      setOfficialStudents(records.map(mapOfficialStudent));
    } catch (err) {
      setOfficialError(getErrorMessage(err));
    } finally {
      setOfficialLoading(false);
    }
  };

  useEffect(() => {
    loadOfficialStudents();
  }, []);

  const showToast = (msg, color = "var(--navy)") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const updateLocalVoter = (updated) => {
    setVoters(current => current.map(voter => (
      voter.id === updated.student_number ? { ...voter, ...mapBackendVoter(updated) } : voter
    )));
  };

  const handleStatusUpdate = async (id, status) => {
    const voter = voters.find(item => item.id === id);
    if (!voter) return;

    setUpdatingId(id);
    setActionError("");

    try {
      const updated = await api.updateVoterStatus(voter.dbId, status);
      updateLocalVoter(updated);
      showToast(status === "approved" ? "Voter approved" : "Voter rejected", status === "approved" ? "var(--teal)" : "var(--red)");
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = (id) => handleStatusUpdate(id, "approved");
  const handleReject = (id) => handleStatusUpdate(id, "rejected");

  const handleDownloadTemplate = () => {
    const header = "studentnumber,firstname,middlename,lastname,department,year,section,email";
    const example = "123456789,First,Middle,Last,CCS,1st Year,SECTION,email@example.com";
    const blob = new Blob([[header, example].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickpal_official_students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Template downloaded");
  };

  const handleExportCSV = () => {
    const header = "studentnumber,firstname,middlename,lastname,department,year,section,email,regstatus,official_match,voted";
    const rows = voters.map(v =>
      [v.id, v.firstName, v.middleName, v.lastName, v.dept, v.year, v.section, v.email, v.regStatus, v.officialMatch?.status, v.voted].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickpal_voters_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Voter list exported");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result
        .trim()
        .split(/\r?\n/)
        .filter(line => line.trim());

      if (lines.length < 2) {
        showToast("No official student records found in the CSV.", "var(--red)");
        return;
      }

      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "").trim());
      const col = (name) => headers.indexOf(name);

      if (col("studentnumber") < 0 && col("studentid") < 0 && col("student_number") < 0) {
        showToast("Missing required column: studentnumber or studentid", "var(--red)");
        return;
      }

      const idIdx = col("studentnumber") >= 0 ? col("studentnumber") : col("studentid") >= 0 ? col("studentid") : col("student_number");
      const fnIdx = col("firstname");
      const mnIdx = col("middlename");
      const lnIdx = col("lastname");
      const deptIdx = col("department");
      const yrIdx = col("year");
      const yrLevelIdx = col("yearlevel");
      const secIdx = col("section");
      const emIdx = col("email");

      const parsed = lines.slice(1).map(line => {
        const cells = parseCsvLine(line);
        return {
          student_number: cells[idIdx] || "",
          first_name: fnIdx >= 0 ? cells[fnIdx] : "",
          middle_name: mnIdx >= 0 ? cells[mnIdx] : "",
          last_name: lnIdx >= 0 ? cells[lnIdx] : "",
          department: deptIdx >= 0 ? cells[deptIdx] : "",
          year_level: yrIdx >= 0 ? cells[yrIdx] : yrLevelIdx >= 0 ? cells[yrLevelIdx] : "",
          section: secIdx >= 0 ? cells[secIdx] : "",
          email: emIdx >= 0 ? cells[emIdx] : "",
        };
      });

      setActionError("");
      setImportSummary(null);
      setPendingImport(parsed);
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const confirmImport = async () => {
    if (!pendingImport?.length) return;

    setImporting(true);
    setActionError("");
    setImportSummary(null);

    try {
      const result = await api.importOfficialStudents(pendingImport);
      const [refreshed] = await Promise.all([
        api.voters(),
        loadOfficialStudents(),
      ]);
      setVoters(refreshed.map(mapBackendVoter));
      setImportSummary(result);
      setPendingImport(null);
      const changed = result.imported_count + result.updated_count;
      showToast(`${changed} official record${changed !== 1 ? "s" : ""} imported`, changed > 0 ? "var(--teal)" : "var(--gold)");
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const filtered = voters.filter(v => {
    const fullName = `${v.firstName} ${v.middleName} ${v.lastName}`.toLowerCase();
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || v.id.includes(search) || v.email.toLowerCase().includes(search.toLowerCase());
    const matchReg = regFilter === "All" || v.regStatus === regFilter.toLowerCase();
    const matchDept = deptFilter === "All" || v.dept === deptFilter;
    const matchOfficial = officialFilter === "All" || v.officialMatch?.status === officialFilter;
    const matchVote = voteFilter === "All" || (voteFilter === "Voted" && v.voted) || (voteFilter === "Not Voted" && !v.voted);
    return matchSearch && matchReg && matchDept && matchOfficial && matchVote;
  });

  const pendingCount = voters.filter(v => v.regStatus === "pending").length;
  const approvedCount = voters.filter(v => v.regStatus === "approved").length;
  const rejectedCount = voters.filter(v => v.regStatus === "rejected").length;
  const officialPreview = officialStudents.slice(0, 8);
  const departmentOptions = Array.from(new Set([
    ...voters.map(voter => voter.dept),
    ...officialStudents.map(student => student.dept),
  ].filter(Boolean))).sort();

  return (
    <div className="page-scroll-admin">
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange} />
      {viewing && <VoterDetailModal voter={viewing} onClose={() => setViewing(null)} onApprove={handleApprove} onReject={handleReject} />}

      {pendingImport && (
        <div className="overlay-centered" onClick={e => e.target === e.currentTarget && !importing && setPendingImport(null)}>
          <div className="modal-centered" style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)" }}>Preview Official Student List</h2>
                <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 4 }}>{pendingImport.length} rows ready to import for registration validation.</p>
              </div>
              <button onClick={() => setPendingImport(null)} disabled={importing} style={{ background: "var(--gray-100)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--gray-500)" }}>x</button>
            </div>
            <div className="card" style={{ overflow: "auto", maxHeight: 300, marginBottom: 16 }}>
              <table>
                <thead><tr><th>Student No.</th><th>Name</th><th>Dept</th><th>Year</th><th>Email</th></tr></thead>
                <tbody>
                  {pendingImport.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.student_number}</td>
                      <td style={{ fontSize: 13 }}>{[row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ")}</td>
                      <td style={{ fontSize: 13 }}>{row.department}</td>
                      <td style={{ fontSize: 13 }}>{row.year_level}</td>
                      <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingImport.length > 20 && <p style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 14 }}>Showing first 20 rows only.</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} disabled={importing} onClick={() => setPendingImport(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 2, justifyContent: "center" }} disabled={importing} onClick={confirmImport}>
                {importing ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--navy)", marginBottom: 4 }}>Voter Registration</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Review registrations against the official student list before approval.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-outline" style={{ padding: "9px 14px", fontSize: 13 }} onClick={handleDownloadTemplate}>
            <Icon name="download" size={15} /> Official Template
          </button>
          <button className="btn-outline" style={{ padding: "9px 14px", fontSize: 13, opacity: importing ? 0.6 : 1 }} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Icon name="upload" size={15} /> {importing ? "Importing..." : "Import Official List"}
          </button>
          <button className="btn-primary" style={{ padding: "9px 14px", fontSize: 13 }} onClick={handleExportCSV}>
            <Icon name="download" size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Approved", value: approvedCount, color: "var(--green)", badge: "badge-green", filter: "Approved" },
          { label: "Pending", value: pendingCount, color: "var(--gold)", badge: "badge-gold", filter: "Pending" },
          { label: "Rejected", value: rejectedCount, color: "var(--red)", badge: "badge-red", filter: "Rejected" },
        ].map((item, index) => (
          <button key={index} onClick={() => setRegFilter(regFilter === item.filter ? "All" : item.filter)} className="card" style={{ padding: "14px 18px", border: "none", cursor: "pointer", textAlign: "left", outline: regFilter === item.filter ? `2px solid ${item.color}` : "none", transition: "all 0.15s" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)" }}>{item.value}</div>
            <span className={`badge ${item.badge}`} style={{ fontSize: 11, marginTop: 4 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {pendingCount > 0 && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius)", padding: "12px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <Icon name="info" size={18} color="var(--gold)" />
          <p style={{ fontSize: 13, color: "var(--gray-700)", margin: 0 }}>
            <strong>{pendingCount} student{pendingCount !== 1 ? "s" : ""}</strong> {pendingCount === 1 ? "is" : "are"} waiting for registration approval.
          </p>
          <button onClick={() => setRegFilter("Pending")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>
            Review
          </button>
        </div>
      )}

      {actionError && (
        <div className="card" style={{ padding: 14, color: "var(--red)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {importSummary && (
        <div className="card" style={{ padding: 14, color: "var(--gray-600)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          <strong style={{ color: "var(--navy)" }}>{importSummary.imported_count}</strong> new,{" "}
          <strong style={{ color: "var(--navy)" }}>{importSummary.updated_count}</strong> updated,{" "}
          <strong style={{ color: importSummary.skipped_count > 0 ? "var(--gold)" : "var(--navy)" }}>{importSummary.skipped_count}</strong> skipped.
          {importSummary.skipped?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {importSummary.skipped.slice(0, 5).map((item, index) => (
                <span key={index} style={{ color: "var(--gray-500)" }}>
                  Line {item.line}: {item.student_number} - {item.reason}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", margin: 0 }}>Official Student List</h2>
            <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
              {officialStudents.length} imported record{officialStudents.length !== 1 ? "s" : ""} available for registration validation.
            </p>
          </div>
          <button className="btn-outline" style={{ padding: "7px 12px", fontSize: 12 }} onClick={loadOfficialStudents} disabled={officialLoading}>
            {officialLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {officialError && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{officialError}</div>}
        {!officialLoading && officialStudents.length === 0 && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--gray-400)", fontSize: 13, border: "1px dashed var(--gray-200)", borderRadius: "var(--radius-sm)" }}>
            No official students imported yet.
          </div>
        )}
        {officialStudents.length > 0 && (
          <div style={{ overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Student No.</th>
                  <th>Name</th>
                  <th>Dept</th>
                  <th>Year &amp; Section</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {officialPreview.map(student => (
                  <tr key={student.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{student.id}</td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")}</td>
                    <td style={{ fontSize: 13 }}>{student.dept}</td>
                    <td style={{ fontSize: 13 }}>{student.year} - {student.section}</td>
                    <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{student.email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {officialStudents.length > officialPreview.length && (
              <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>
                Showing first {officialPreview.length} records.
              </p>
            )}
          </div>
        )}
      </div>

      {loading && <div className="card" style={{ padding: 16, marginBottom: 16 }}>Loading voters...</div>}
      {error && <div className="card" style={{ padding: 16, color: "var(--red)", marginBottom: 16 }}>{getErrorMessage(error)}</div>}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <input className="input-field" placeholder="Search by name, ID, or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: "auto" }} value={regFilter} onChange={e => setRegFilter(e.target.value)}>
          <option>All</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </select>
        <select className="input-field" style={{ width: "auto" }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="All">All departments</option>
          {departmentOptions.map(department => <option key={department} value={department}>{department}</option>)}
        </select>
        <select className="input-field" style={{ width: "auto" }} value={officialFilter} onChange={e => setOfficialFilter(e.target.value)}>
          <option value="All">All official</option>
          <option value="matched">Matched</option>
          <option value="mismatch">Mismatch</option>
          <option value="not_found">Not found</option>
        </select>
        <select className="input-field" style={{ width: "auto" }} value={voteFilter} onChange={e => setVoteFilter(e.target.value)}>
          <option>All</option>
          <option>Voted</option>
          <option>Not Voted</option>
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Student No.</th>
              <th>Name</th>
              <th>Dept</th>
              <th>Year &amp; Section</th>
              <th>Email</th>
              <th>Reg. Status</th>
              <th>Official List</th>
              <th>Voted</th>
              <th style={{ width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--gray-400)", padding: "28px 0" }}>No voters match your filters.</td></tr>
            )}
            {filtered.map((v, index) => {
              const fullName = [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");
              const regCfg = REG_STATUS[v.regStatus];
              const officialCfg = OFFICIAL_STATUS[v.officialMatch?.status] || OFFICIAL_STATUS.not_found;

              return (
                <tr key={index} style={{ cursor: "pointer" }} onClick={() => setViewing(v)}>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{v.id}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar name={fullName} size={30} bg={v.regStatus === "approved" ? "var(--teal)" : v.regStatus === "pending" ? "var(--gold)" : "var(--gray-300)"} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{fullName}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{v.dept}</td>
                  <td style={{ fontSize: 13 }}>{v.year} - {v.section}</td>
                  <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{v.email}</td>
                  <td><span className={`badge ${regCfg.badgeClass}`} style={{ fontSize: 11 }}>{regCfg.label}</span></td>
                  <td><span className={`badge ${officialCfg.badgeClass}`} style={{ fontSize: 11 }}>{officialCfg.label}</span></td>
                  <td><span className={`badge ${v.voted ? "badge-green" : "badge-gray"}`} style={{ fontSize: 11 }}>{v.voted ? "Voted" : "-"}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    {v.regStatus === "pending" && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          title="Approve"
                          onClick={() => handleApprove(v.id)}
                          disabled={updatingId === v.id}
                          style={{ padding: "5px 8px", borderRadius: "var(--radius-sm)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", color: "var(--green)", fontSize: 11, fontWeight: 700 }}
                        >
                          OK
                        </button>
                        <button
                          title="Reject"
                          onClick={() => handleReject(v.id)}
                          disabled={updatingId === v.id}
                          style={{ padding: "5px 8px", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", color: "var(--red)", fontSize: 11, fontWeight: 700 }}
                        >
                          No
                        </button>
                      </div>
                    )}
                    {v.regStatus !== "pending" && (
                      <span style={{ fontSize: 12, color: "var(--gray-300)" }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 10 }}>
        {filtered.length} of {voters.length} voters - {approvedCount} approved - {pendingCount} pending
      </p>
    </div>
  );
};

export default AdminVoters;
