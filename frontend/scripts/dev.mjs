import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");

config({ path: path.join(frontendRoot, ".env.local") });
config({ path: path.join(frontendRoot, ".env") });

const child = spawn("next", ["dev"], {
  cwd: frontendRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
