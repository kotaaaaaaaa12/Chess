import { spawn } from "child_process";
import { createServer } from "net";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, "..");
const repoRoot = path.join(serverRoot, "..");
const frontendRoot = path.join(repoRoot, "frontend");

config({ path: path.join(serverRoot, ".env.local") });
config({ path: path.join(serverRoot, ".env") });
config({ path: path.join(frontendRoot, ".env.local") });

const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const API_PORT = parseInt(process.env.API_PORT ?? "4000", 10);

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
}

const wsFree = await portFree(WS_PORT);
const apiFree = await portFree(API_PORT);

if (apiFree || wsFree) {
  const server = spawn("npm", ["run", "dev"], {
    cwd: serverRoot,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, API_PORT: String(API_PORT), WS_PORT: String(WS_PORT) },
  });
  server.unref();
  console.log(`Starting API on :${API_PORT} and WS on :${WS_PORT}…`);
} else {
  console.log(`Ports ${API_PORT}/${WS_PORT} in use — reusing existing server.`);
}

const next = spawn("npm", ["run", "dev"], {
  cwd: frontendRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, API_URL: `http://localhost:${API_PORT}` },
});

next.on("exit", (code) => process.exit(code ?? 0));
