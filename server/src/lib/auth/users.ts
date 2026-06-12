import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthAccounts, users, type DbUser } from "@/lib/db/schema";
import type { UserStats } from "@/lib/stats/types";
import type { AuthUser, GoogleProfile } from "./types";
import { hashPassword, verifyPassword } from "./password";

function toUserStats(user: DbUser): UserStats {
  return {
    elo: user.elo ?? 1200,
    wins: user.wins ?? 0,
    losses: user.losses ?? 0,
    draws: user.draws ?? 0,
    gamesPlayed: user.gamesPlayed ?? 0,
  };
}

function toAuthUser(user: DbUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    stats: toUserStats(user),
  };
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
}

async function uniqueUsername(base: string): Promise<string> {
  const db = getDb();
  let candidate = normalizeUsername(base) || "player";
  if (candidate.length < 3) candidate = `${candidate}_user`.slice(0, 20);

  for (let i = 0; i < 20; i++) {
    const suffix = i === 0 ? "" : `_${Math.floor(Math.random() * 9999)}`;
    const username = `${candidate}${suffix}`.slice(0, 32);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!existing) return username;
  }

  return `user_${Date.now().toString(36)}`.slice(0, 32);
}

export async function registerUser(input: {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
}): Promise<{ user: AuthUser } | { error: string }> {
  const username = input.username.trim().toLowerCase();
  const password = input.password;
  const displayName = (input.displayName?.trim() || input.username.trim()).slice(0, 64);
  const email = input.email?.trim().toLowerCase() || null;

  if (username.length < 3) return { error: "Username must be at least 3 characters" };
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username can only use letters, numbers, underscore" };
  }
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address" };
  }

  const db = getDb();

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existingUsername) return { error: "Username already taken" };

  if (email) {
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingEmail) return { error: "Email already registered" };
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      displayName,
      email,
      passwordHash: await hashPassword(password),
    })
    .returning();

  return { user: toAuthUser(created) };
}

export async function loginUser(input: {
  username: string;
  password: string;
}): Promise<{ user: AuthUser } | { error: string }> {
  const username = input.username.trim().toLowerCase();
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user?.passwordHash) {
    return { error: "Invalid username or password" };
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return { error: "Invalid username or password" };

  return { user: toAuthUser(user) };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ? toAuthUser(user) : null;
}

export async function updateUserProfile(
  userId: string,
  input: { username?: string; displayName?: string }
): Promise<{ user: AuthUser } | { error: string }> {
  const db = getDb();
  const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current) return { error: "User not found" };

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

  if (input.username !== undefined) {
    const username = input.username.trim().toLowerCase();
    if (username.length < 3) return { error: "Username must be at least 3 characters" };
    if (!/^[a-z0-9_]+$/.test(username)) {
      return { error: "Username can only use letters, numbers, underscore" };
    }
    if (username !== current.username) {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (taken) return { error: "Username already taken" };
      updates.username = username;
    }
  }

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim().slice(0, 64);
    if (displayName.length < 1) return { error: "Display name cannot be empty" };
    updates.displayName = displayName;
  }

  if (!updates.username && !updates.displayName) {
    return { user: toAuthUser(current) };
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  return { user: toAuthUser(updated) };
}

export async function findOrCreateGoogleUser(
  profile: GoogleProfile
): Promise<{ user: AuthUser } | { error: string }> {
  if (!profile.sub || !profile.email) {
    return { error: "Google account missing required profile data" };
  }

  const db = getDb();
  const provider = "google";
  const email = profile.email.toLowerCase();

  const linked = await db
    .select({ user: users })
    .from(oauthAccounts)
    .innerJoin(users, eq(oauthAccounts.userId, users.id))
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, profile.sub)
      )
    )
    .limit(1);

  if (linked[0]?.user) {
    const existing = linked[0].user;
    const [updated] = await db
      .update(users)
      .set({
        displayName: profile.name?.slice(0, 64) || existing.displayName,
        avatarUrl: profile.picture ?? existing.avatarUrl,
        email: existing.email ?? email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();
    return { user: toAuthUser(updated) };
  }

  const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (byEmail) {
    await db.insert(oauthAccounts).values({
      userId: byEmail.id,
      provider,
      providerAccountId: profile.sub,
    });

    const [updated] = await db
      .update(users)
      .set({
        displayName: profile.name?.slice(0, 64) || byEmail.displayName,
        avatarUrl: profile.picture ?? byEmail.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byEmail.id))
      .returning();

    return { user: toAuthUser(updated) };
  }

  const username = await uniqueUsername(email.split("@")[0] || profile.name || "player");
  const displayName = (profile.name || email.split("@")[0] || "Player").slice(0, 64);

  const [created] = await db
    .insert(users)
    .values({
      email,
      username,
      displayName,
      avatarUrl: profile.picture ?? null,
      passwordHash: null,
    })
    .returning();

  await db.insert(oauthAccounts).values({
    userId: created.id,
    provider,
    providerAccountId: profile.sub,
  });

  return { user: toAuthUser(created) };
}
