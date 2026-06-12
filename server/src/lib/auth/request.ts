type AuthHeaders = {
  authorization?: string;
  get?: (name: string) => string | null | undefined;
};

export function getBearerToken(request: { headers: AuthHeaders }): string | null {
  const auth =
    typeof request.headers.get === "function"
      ? request.headers.get("authorization")
      : request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}
