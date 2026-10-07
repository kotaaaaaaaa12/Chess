import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const folder = mkdtempSync(path.join(tmpdir(), 'chess-core-'));
for (const name of ['game', 'piece', 'constants', 'history', 'draw', 'fen', 'replay', 'simulationGame', 'types']) {
  const source = readFileSync(new URL(`../../frontend/src/lib/chess/${name}.ts`, import.meta.url), 'utf8');
  writeFileSync(path.join(folder, `${name}.js`), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText);
}
const require = createRequire(import.meta.url);
const { Game } = require(path.join(folder, 'game.js'));
const { INITIAL_PIECES, clonePieces } = require(path.join(folder, 'constants.js'));
const fresh = () => new Game(clonePieces(INITIAL_PIECES), 'white');
const play = (g, moves) => moves.forEach(([name, square, rank]) => assert.equal(g.movePiece(name, square, rank), true, `${name} -> ${square}`));
process.on('exit', () => rmSync(folder, { recursive: true, force: true }));

test('en passant removes the pawn behind the destination and survives replay', () => {
  const g = fresh();
  play(g, [['whitePawn5', 45], ['blackPawn1', 61], ['whitePawn5', 55], ['blackPawn4', 54], ['whitePawn5', 64]]);
  assert.equal(g.getPieceByName('blackPawn4'), undefined);
  assert.equal(g.getPieceByName('whitePawn5').position, 64);
  const restored = fresh(); restored.restoreFromHistory(g.history.getAll());
  assert.equal(restored.getPieceByName('blackPawn4'), undefined);
  assert.equal(restored.getPieceByName('whitePawn5').position, 64);
});
test('castling moves both pieces and keeps castling rights after replay', () => {
  const g = fresh();
  play(g, [['whitePawn5', 45], ['blackPawn5', 55], ['whiteKnight2', 36], ['blackKnight1', 63], ['whiteBishop2', 43], ['blackKnight2', 66], ['whiteKing', 17]]);
  assert.equal(g.getPieceByName('whiteRook2').position, 16);
  const restored = fresh(); restored.restoreFromHistory(g.history.getAll());
  assert.equal(restored.getPieceByName('whiteKing').position, 17);
  assert.equal(restored.getPieceByName('whiteRook2').position, 16);
  assert.equal(restored.getPieceByName('whiteKing').ableToCastle, false);
});
test('promotion leaves historical pawn names intact and can be restored', () => {
  const g = fresh();
  play(g, [['whitePawn1', 41], ['blackPawn8', 58], ['whitePawn1', 51], ['blackPawn8', 48], ['whitePawn1', 61], ['blackPawn8', 38], ['whitePawn1', 72], ['blackPawn8', 27], ['whitePawn1', 81, 'knight']]);
  assert.equal(g.history.getAll()[0][0].piece.name, 'whitePawn1');
  assert.equal(g.history.getAll()[0][0].piece.rank, 'pawn');
  assert.equal(g.getPieceByName('whiteKnight1').position, 12);
  assert.equal(g.getPieceByName('whiteKnightPromoted1').position, 81);
  assert.equal(new Set(g.pieces.map(p => p.name)).size, g.pieces.length);
  assert.equal(g.halfMoveClock, 0);
  play(g, [['blackKnight1', 63], ['whiteKnightPromoted1', 62]]);
  const restored = fresh(); restored.restoreFromHistory(g.history.getAll());
  assert.equal(restored.getPieceByName('whiteKnightPromoted1').position, 62);
  assert.equal(restored.getPieceByName('whiteKnight1').position, 12);
  assert.equal(restored.turn, g.turn);
});

test('mobility checks keep both sides available during AI search', () => {
  const g = fresh();
  assert.equal(g.king_dead('white'), false);
  assert.equal(g.king_dead('black'), false);
  assert.equal(g.turn, 'white');
});
