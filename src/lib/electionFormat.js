export const normalizeElection = (election) => {
  const startsAt = election.starts_at ? new Date(election.starts_at) : null;
  const endsAt = election.ends_at ? new Date(election.ends_at) : null;
  const totalVoters = election.total_voters ?? election.totalVoters ?? 0;

  return {
    ...election,
    totalVoters,
    openDate: startsAt ? startsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBA",
    closeDate: endsAt ? endsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBA",
    endsIn: formatElectionTime(election.status, startsAt, endsAt),
    official: Boolean(election.results_published),
    dept: election.department,
  };
};

const formatElectionTime = (status, startsAt, endsAt) => {
  const now = new Date();
  const target = status === "upcoming" ? startsAt : endsAt;

  if (status === "closed") return "Ended";
  if (!target) return status === "upcoming" ? "Opens soon" : "TBA";

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return status === "upcoming" ? "Opens now" : "Ending now";

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.max(1, Math.floor((diffMs % 3600000) / 60000));

  if (status === "upcoming") {
    if (days > 0) return `Opens in ${days}d ${hours}h`;
    if (hours > 0) return `Opens in ${hours}h ${minutes}m`;
    return `Opens in ${minutes}m`;
  }

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
