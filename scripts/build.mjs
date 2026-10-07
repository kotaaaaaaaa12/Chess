import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = path.join(root, 'frontend');
const marker = path.join(root, '.wrangler', 'frontend-build.json');
const ignored = new Set(['node_modules', '.next', 'out', '.git', '.DS_Store', 'next-env.d.ts']);
const generated = new Set(['public/stockfish/stockfish.js', 'public/stockfish/stockfish.wasm']);
const hash = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url)));
hash.update(process.version);
for (const [key, value] of Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_')).sort()) {
  hash.update(JSON.stringify([key, value]));
}
function fingerprint(directory, relative = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (ignored.has(entry.name) || entry.name.endsWith('.tsbuildinfo') || generated.has(name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) fingerprint(full, name);
    else if (entry.isFile()) hash.update(name).update('\0').update(readFileSync(full)).update('\0');
  }
}
fingerprint(frontend);
const digest = hash.digest('hex');
let previous;
try { previous = JSON.parse(readFileSync(marker, 'utf8')).hash; } catch {}
if (process.argv.includes('--if-needed') && previous === digest &&
    ['index.html', 'stockfish/stockfish.js', 'stockfish/stockfish.wasm'].every(name => existsSync(path.join(frontend, 'out', name)))) {
  console.log('Frontend export is up to date.');
  process.exit(0);
}

rmSync(marker, { force: true });
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const args of [['ci'], ['run', 'build']]) {
  const result = spawnSync(npm, args, { cwd: frontend, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
mkdirSync(path.dirname(marker), { recursive: true });
writeFileSync(marker, JSON.stringify({ hash: digest }) + '\n');
