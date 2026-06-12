const fs = require("fs");
const path = require("path");

function findStockfishBin() {
  const candidates = [path.join(__dirname, "../node_modules/stockfish/bin")];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "stockfish-18-lite-single.js"))) return dir;
  }
  throw new Error("stockfish package not found — run npm install");
}

const src = findStockfishBin();
const dest = path.join(__dirname, "../public/stockfish");

fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(
  path.join(src, "stockfish-18-lite-single.js"),
  path.join(dest, "stockfish.js")
);
fs.copyFileSync(
  path.join(src, "stockfish-18-lite-single.wasm"),
  path.join(dest, "stockfish.wasm")
);
