const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getTopSelectors: (limit = 20) =>
    fetchJson(`/league/top-selectors?limit=${limit}`),

  getClutch: (limit = 25) =>
    fetchJson(`/league/clutch?limit=${limit}`),

  getTeamDefense: () =>
    fetchJson("/team-defense"),

  getPlayers: (minFga = 50) =>
    fetchJson(`/players?min_fga=${minFga}&sort_by=player_name&order=asc`),

  getPlayerScatter: (playerId) =>
    fetchJson(`/players/${playerId}/scatter`),
};
