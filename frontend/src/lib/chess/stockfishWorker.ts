import type { AiDifficulty } from "./types";
import { fenSideToMove, parseUciScore, type PositionEval } from "./evalUtils";

const STOCKFISH_PATH = "/stockfish/stockfish.js";

const DIFFICULTY: Record<AiDifficulty, { movetime: number; elo?: number }> = {
  easy: { movetime: 400, elo: 1000 },
  medium: { movetime: 900, elo: 1550 },
  hard: { movetime: 2000, elo: 2200 },
};

type MoveRequest = {
  kind: "move";
  fen: string;
  difficulty: AiDifficulty;
  resolve: (uci: string | null) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type EvalRequest = {
  kind: "eval";
  fen: string;
  resolve: (eval_: PositionEval) => void;
  reject: (err: Error) => void;
  bestEval: PositionEval | null;
  timer: ReturnType<typeof setTimeout>;
};

type HintRequest = {
  kind: "hint";
  fen: string;
  resolve: (uci: string | null) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ReviewRequest = {
  kind: "review";
  fen: string;
  resolve: (result: { bestUci: string | null; eval: PositionEval }) => void;
  reject: (err: Error) => void;
  bestEval: PositionEval | null;
  timer: ReturnType<typeof setTimeout>;
};

type Request = MoveRequest | EvalRequest | HintRequest | ReviewRequest;

let worker: Worker | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let current: Request | null = null;
const queue: Request[] = [];

function send(cmd: string): void {
  worker?.postMessage(cmd);
}

function finishCurrent(): void {
  if (current) clearTimeout(current.timer);
  current = null;
  runNext();
}

function runNext(): void {
  if (current || !queue.length || !ready) return;
  current = queue.shift()!;

  if (current.kind === "move") {
    const cfg = DIFFICULTY[current.difficulty];
    send("ucinewgame");
    if (cfg.elo) {
      send("setoption name UCI_LimitStrength value true");
      send(`setoption name UCI_Elo value ${cfg.elo}`);
    } else {
      send("setoption name UCI_LimitStrength value false");
    }
    send(`position fen ${current.fen}`);
    send(`go movetime ${cfg.movetime}`);
  } else if (current.kind === "hint") {
    send("setoption name UCI_LimitStrength value false");
    send(`position fen ${current.fen}`);
    send("go depth 10");
  } else if (current.kind === "review") {
    send("setoption name UCI_LimitStrength value false");
    send(`position fen ${current.fen}`);
    send("go depth 12");
  } else {
    send("setoption name UCI_LimitStrength value false");
    send(`position fen ${current.fen}`);
    send("go depth 14");
  }
}

function enqueue<T>(build: (resolve: (v: T) => void, reject: (e: Error) => void) => Request): Promise<T> {
  return ensureWorker().then(
    () =>
      new Promise<T>((resolve, reject) => {
        queue.push(build(resolve as (v: unknown) => void, reject));
        if (current) send("stop");
        else runNext();
      })
  );
}

function handleLine(line: string): void {
  if (!current) return;

  if ((current.kind === "eval" || current.kind === "review") && line.includes("score")) {
    const side = fenSideToMove(current.fen);
    current.bestEval = parseUciScore(
      line.match(/score cp (-?\d+)/),
      line.match(/score mate (-?\d+)/),
      side
    );
  }

  if (line.startsWith("bestmove")) {
    const match = line.match(/^bestmove (\S+)/);
    const uci = match && match[1] !== "(none)" ? match[1] : null;
    if (current.kind === "move" || current.kind === "hint") {
      current.resolve(uci);
    } else if (current.kind === "review") {
      current.resolve({ bestUci: uci, eval: current.bestEval ?? { cp: 0, mate: null } });
    } else {
      current.resolve(current.bestEval ?? { cp: 0, mate: null });
    }
    finishCurrent();
  }
}

export function ensureWorker(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Stockfish only runs in the browser"));
  }
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new window.Worker(STOCKFISH_PATH);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const timeout = setTimeout(() => reject(new Error("Stockfish engine timed out")), 15000);

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = String(e.data);
      if (line === "uciok") {
        clearTimeout(timeout);
        ready = true;
        resolve();
        return;
      }
      handleLine(line);
    };

    worker.onerror = () => {
      clearTimeout(timeout);
      worker?.terminate();
      worker = null;
      initPromise = null;
      reject(new Error("Stockfish worker failed to load"));
    };

    worker.postMessage("uci");
  });

  return initPromise;
}

export function requestBestMove(fen: string, difficulty: AiDifficulty): Promise<string | null> {
  return enqueue((resolve, reject) => ({
    kind: "move",
    fen,
    difficulty,
    resolve,
    reject,
    timer: setTimeout(() => {
      if (current?.kind === "move") {
        current.reject(new Error("Stockfish move timed out"));
        finishCurrent();
      }
    }, DIFFICULTY[difficulty].movetime + 5000),
  }));
}

export function requestHintMove(fen: string): Promise<string | null> {
  return enqueue((resolve, reject) => ({
    kind: "hint",
    fen,
    resolve,
    reject,
    timer: setTimeout(() => {
      if (current?.kind === "hint") {
        current.reject(new Error("Hint timed out"));
        finishCurrent();
      }
    }, 8000),
  }));
}

export function requestReviewAnalysis(
  fen: string
): Promise<{ bestUci: string | null; eval: PositionEval }> {
  return enqueue((resolve, reject) => ({
    kind: "review",
    fen,
    resolve,
    reject,
    bestEval: null,
    timer: setTimeout(() => {
      if (current?.kind === "review") {
        current.resolve({ bestUci: null, eval: current.bestEval ?? { cp: 0, mate: null } });
        finishCurrent();
      }
    }, 10000),
  }));
}

export function requestEval(fen: string): Promise<PositionEval> {
  return enqueue((resolve, reject) => ({
    kind: "eval",
    fen,
    resolve,
    reject,
    bestEval: null,
    timer: setTimeout(() => {
      if (current?.kind === "eval") {
        current.resolve(current.bestEval ?? { cp: 0, mate: null });
        finishCurrent();
      }
    }, 6000),
  }));
}

export function resetStockfish(): void {
  if (ready) send("ucinewgame");
}

export function disposeStockfish(): void {
  queue.length = 0;
  if (current) clearTimeout(current.timer);
  current = null;
  worker?.terminate();
  worker = null;
  ready = false;
  initPromise = null;
}
