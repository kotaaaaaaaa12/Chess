export function buildInviteLink(roomId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("join", roomId);
  return url.toString();
}
