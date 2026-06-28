const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const SESSION_KEY = "pickpal.session";

function authHeader() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeader(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      // Keep the status-based fallback when the API does not return JSON.
    }

    const message = payload?.message || `PickPal API request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.errors = payload?.errors;
    throw error;
  }

  return response.json();
}

function queryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const value = searchParams.toString();
  return value ? `?${value}` : "";
}

export const api = {
  health: () => request("/health"),
  me: () => request("/me"),
  logout: () => request("/logout", {
    method: "POST",
  }),
  uploadImage: (payload) => request("/uploads/images", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  adminLogin: (payload) => request("/admin/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  requestPasswordReset: (payload) => request("/password/forgot", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  resetPassword: (payload) => request("/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  changeAdminPassword: (payload) => request("/admin/password", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  transferAdmin: (payload) => request("/admin/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  voterLogin: (payload) => request("/voter/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  changeVoterPassword: (payload) => request("/voter/password", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateVoterProfilePhoto: (payload) => request("/voter/profile-photo", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  dashboardStats: () => request("/admin/dashboard"),
  surveyAnalytics: () => request("/admin/analytics"),
  elections: () => request("/elections"),
  adminElections: (params = {}) => request(`/admin/elections${queryString(params)}`),
  createElection: (payload) => request("/elections", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateElection: (id, payload) => request(`/elections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  updateElectionStatus: (id, status) => request(`/elections/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  updateElectionArchive: (id, archived) => request(`/elections/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived }),
  }),
  deleteElection: (id) => request(`/elections/${id}`, {
    method: "DELETE",
  }),
  updateResultsPublishStatus: (id, published) => request(`/elections/${id}/results-publish`, {
    method: "PATCH",
    body: JSON.stringify({ published }),
  }),
  election: (id) => request(`/elections/${id}`),
  createPosition: (electionId, payload) => request(`/elections/${electionId}/positions`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updatePosition: (electionId, positionId, payload) => request(`/elections/${electionId}/positions/${positionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deletePosition: (electionId, positionId) => request(`/elections/${electionId}/positions/${positionId}`, {
    method: "DELETE",
  }),
  voteEligibility: (electionId) => request(`/elections/${electionId}/eligibility`),
  candidates: (electionId) => request(`/elections/${electionId}/candidates`),
  adminCandidates: (electionId) => request(`/admin/elections/${electionId}/candidates`),
  createCandidate: (electionId, payload) => request(`/elections/${electionId}/candidates`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateCandidate: (electionId, candidateId, payload) => request(`/elections/${electionId}/candidates/${candidateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deleteCandidate: (electionId, candidateId) => request(`/elections/${electionId}/candidates/${candidateId}`, {
    method: "DELETE",
  }),
  results: (electionId) => request(`/elections/${electionId}/results`),
  adminResults: (electionId) => request(`/admin/elections/${electionId}/results`),
  surveys: () => request("/surveys"),
  createSurvey: (payload) => request("/surveys", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateSurvey: (surveyId, payload) => request(`/surveys/${surveyId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deleteSurvey: (surveyId) => request(`/surveys/${surveyId}`, {
    method: "DELETE",
  }),
  surveyResponses: (surveyId) => request(`/surveys/${surveyId}/responses`),
  submitSurveyResponse: (surveyId, payload) => request(`/surveys/${surveyId}/responses`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  voters: () => request("/voters"),
  registerVoter: (payload) => request("/voters/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  importOfficialStudents: (students) => request("/official-students/import", {
    method: "POST",
    body: JSON.stringify({ students }),
  }),
  officialStudents: () => request("/official-students"),
  updateVoterStatus: (voterId, registrationStatus) => request(`/voters/${voterId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ registration_status: registrationStatus }),
  }),
  auditLogs: (params) => request(`/audit-logs${queryString(params)}`),
  castVote: (payload) => request("/votes", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
