import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { gamesRouter } from "./routes/games";

export function createHttpApp() {
  const app = express();

  const frontendUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chess-server" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/games", gamesRouter);

  return app;
}
