import { Router } from "express";
import { verifyToken } from "@/lib/auth/jwt";
import { getBearerToken } from "@/lib/auth/request";
import { createGame, getGameForUser, listGamesForUser } from "@/lib/games/repository";
import type { SaveGameInput } from "@/lib/games/types";
import { applyCasualGameStats, applyRatedGameStats } from "@/lib/stats/repository";
import type { UserStats } from "@/lib/stats/types";

export const gamesRouter = Router();

async function getUserId(req: { headers: { authorization?: string } }): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.sub ?? null;
}

gamesRouter.get("/", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const games = await listGamesForUser(userId);
    res.json({ games });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load games";
    res.status(500).json({ error: message });
  }
});

gamesRouter.post("/", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const body = req.body as SaveGameInput;
    if (!body.history?.length || !body.playAgainst || !body.result) {
      res.status(400).json({ error: "Invalid game payload" });
      return;
    }
    const game = await createGame(userId, body);
    let stats: UserStats | undefined;
    const isComputer = body.playAgainst === "minimax" || body.playAgainst === "stockfish";
    if (isComputer) {
      if (body.rated) {
        stats = await applyRatedGameStats(userId, {
          result: body.result,
          eloBefore: body.eloBefore,
          eloChange: body.eloChange,
        });
      } else {
        stats = await applyCasualGameStats(userId, body.result);
      }
    }
    res.json({ game, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save game";
    res.status(message.includes("games") ? 503 : 500).json({ error: message });
  }
});

gamesRouter.get("/:id", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const game = await getGameForUser(userId, req.params.id);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load game";
    res.status(500).json({ error: message });
  }
});
