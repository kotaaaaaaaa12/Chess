import { randomUUID } from "crypto";
import { Router } from "express";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getAppUrl,
  isGoogleAuthConfigured,
} from "@/lib/auth/google";
import { signToken, verifyToken } from "@/lib/auth/jwt";
import { getBearerToken } from "@/lib/auth/request";
import { findOrCreateGoogleUser, findUserById, loginUser, registerUser, updateUserProfile } from "@/lib/auth/users";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const result = await loginUser({ username, password });
    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    const token = await signToken(result.user);
    res.json({ token, user: result.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(message.includes("DATABASE_URL") ? 503 : 500).json({ error: message });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    const body = req.body as {
      username?: string;
      password?: string;
      displayName?: string;
      email?: string;
    };
    if (!body.username || !body.password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const result = await registerUser({
      username: body.username,
      password: body.password,
      displayName: body.displayName,
      email: body.email,
    });
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const token = await signToken(result.user);
    res.json({ token, user: result.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(message.includes("DATABASE_URL") ? 503 : 500).json({ error: message });
  }
});

authRouter.get("/me", async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const user = await findUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

authRouter.patch("/profile", async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  try {
    const body = req.body as { username?: string; displayName?: string };
    const result = await updateUserProfile(payload.sub, {
      username: body.username,
      displayName: body.displayName,
    });
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const newToken = await signToken(result.user);
    res.json({ user: result.user, token: newToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    res.status(500).json({ error: message });
  }
});

authRouter.get("/google", (req, res) => {
  if (!isGoogleAuthConfigured()) {
    res.status(503).json({
      error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL.",
    });
    return;
  }
  const state = randomUUID();
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600_000,
    path: "/",
  });
  res.redirect(buildGoogleAuthUrl(state));
});

authRouter.get("/google/callback", async (req, res) => {
  const redirectError = (message: string) => {
    const url = new URL(getAppUrl());
    url.searchParams.set("auth_error", message);
    res.redirect(url.toString());
  };

  if (!isGoogleAuthConfigured()) {
    redirectError("Google OAuth is not configured");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const googleError = typeof req.query.error === "string" ? req.query.error : null;

  if (googleError) {
    redirectError("Google sign-in was cancelled");
    return;
  }
  if (!code || !state) {
    redirectError("Missing Google OAuth parameters");
    return;
  }

  const savedState = req.cookies?.oauth_state;
  res.clearCookie("oauth_state", { path: "/" });

  if (!savedState || savedState !== state) {
    redirectError("Invalid OAuth state. Please try again.");
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const result = await findOrCreateGoogleUser(profile);
    if ("error" in result) {
      redirectError(result.error);
      return;
    }
    const token = await signToken(result.user);
    const url = new URL(getAppUrl());
    url.searchParams.set("auth_token", token);
    res.redirect(url.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    redirectError(message);
  }
});
