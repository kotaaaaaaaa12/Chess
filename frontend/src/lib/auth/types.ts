import type { UserStats } from "@/lib/stats/types";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  stats: UserStats;
}

export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  email?: string | null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}
