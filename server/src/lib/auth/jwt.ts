import { SignJWT, jwtVerify } from "jose";
import type { AuthUser, JwtPayload } from "./types";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET ?? "dev-secret-change-me-in-production";
  return new TextEncoder().encode(raw);
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    name: user.displayName,
    email: user.email ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.username !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      name: payload.name,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    return null;
  }
}
