export const STATS_EVENT = "chess-stats-updated";

export function notifyStatsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STATS_EVENT));
}
