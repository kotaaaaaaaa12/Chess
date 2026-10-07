import { DurableObject } from 'cloudflare:workers';
import { Game } from '../../frontend/src/lib/chess/game';
import { INITIAL_PIECES, clonePieces } from '../../frontend/src/lib/chess/constants';
import type { PieceColor, PieceRank } from '../../frontend/src/lib/chess/types';
import type { Env } from './types';

type Move = { pieceName: string; position: number; promotionRank?: PieceRank };
type Result = { type: 'game_over'; winner?: PieceColor; drawReason?: string; winReason?: string };
type Player = { userId: string; name: string };
type Room = {
  id: string; timeControl: number; status: 'waiting' | 'active' | 'finished';
  players: Partial<Record<PieceColor, Player>>; moves: Move[];
  remaining: Record<PieceColor, number>; lastMoveAt: number; expiresAt: number;
  drawOfferedBy?: PieceColor; result?: Result;
};
type Attachment = { userId: string; color: PieceColor };
const opposite = (c: PieceColor): PieceColor => c === 'white' ? 'black' : 'white';

export class ChessRoom extends DurableObject<Env> {
  private room: Room | undefined;
  private game = new Game(clonePieces(INITIAL_PIECES), 'white');
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = await ctx.storage.get<Room>('room');
      // Replaying the accepted moves restores castling rights, en passant, and repetition.
      for (const move of this.room?.moves ?? []) this.game.movePiece(move.pieceName, move.position, move.promotionRank);
      this.bindEvents();
    });
  }
  private bindEvents() {
    this.game.on('checkMate', winner => this.finish({ type: 'game_over', winner: winner as PieceColor, winReason: 'checkmate' }));
    this.game.on('stalemate', () => this.finish({ type: 'game_over', drawReason: 'stalemate' }));
    this.game.on('draw', reason => this.finish({ type: 'game_over', drawReason: String(reason) }));
  }
  private finish(result: Result) {
    if (!this.room || this.room.status !== 'active') return;
    this.room.status = 'finished';
    this.room.result = result;
    this.room.expiresAt = Date.now() + 86400000;
  }
  private send(ws: WebSocket, data: unknown) { try { ws.send(JSON.stringify(data)); } catch { /* The close handler notifies the opponent. */ } }
  private sockets(color?: PieceColor) { return this.ctx.getWebSockets().filter(ws => ws.readyState === 1 && (!color || (ws.deserializeAttachment() as Attachment | null)?.color === color)); }
  private broadcast(data: unknown, exclude?: WebSocket) { for (const ws of this.sockets()) if (ws !== exclude) this.send(ws, data); }
  private clock() {
    const r = this.room!;
    const remaining = { ...r.remaining };
    if (r.status === 'active' && r.lastMoveAt) remaining[this.game.turn] = Math.max(0, remaining[this.game.turn] - (Date.now() - r.lastMoveAt));
    return remaining;
  }
  private async save() {
    const r = this.room!;
    await this.ctx.storage.put('room', r);
    const deadline = r.status === 'active' && r.timeControl && r.lastMoveAt
      ? Math.min(r.expiresAt, r.lastMoveAt + r.remaining[this.game.turn]) : r.expiresAt;
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 1, deadline));
  }
  private sendStart(ws: WebSocket, color: PieceColor) {
    const r = this.room!;
    const times = this.clock();
    this.send(ws, { type: 'game_start', roomId: r.id, color, timeControl: r.timeControl,
      opponentName: r.players[opposite(color)]?.name,
      history: this.game.history.getAll(), whiteTime: times.white / 1000, blackTime: times.black / 1000,
      clockStarted: !!r.lastMoveAt, result: r.result });
    if (r.drawOfferedBy && r.drawOfferedBy !== color) this.send(ws, { type: 'draw_offered' });
    if (!this.sockets(opposite(color)).length) this.send(ws, { type: 'opponent_disconnected' });
  }
  async fetch(request: Request): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (new URL(request.url).pathname === '/init' && request.method === 'POST') {
        if (this.room) return Response.json({ error: 'Room exists' }, { status: 409 });
        const b = await request.json() as { roomId: string; timeControl: number; userId: string; name: string };
        this.room = { id: b.roomId, timeControl: b.timeControl, status: 'waiting',
          players: { white: { userId: b.userId, name: b.name } }, moves: [],
          remaining: { white: b.timeControl * 1000, black: b.timeControl * 1000 },
          lastMoveAt: 0, expiresAt: Date.now() + 900000 };
        await this.save();
        return Response.json({ ok: true });
      }
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket upgrade required', { status: 426 });
      const pair = new WebSocketPair();
      const client = pair[0], ws = pair[1];
      this.ctx.acceptWebSocket(ws);
      const upgrade = () => new Response(null, { status: 101, webSocket: client });
      const reject = (message: string) => { this.send(ws, { type: 'error', message }); ws.close(1008, message); return upgrade(); };
      const r = this.room;
      if (!r || Date.now() >= r.expiresAt) return reject('Room not found or expired');
      const userId = request.headers.get('X-Player-Id');
      if (!userId) return reject('Authentication required');
      let color: PieceColor | undefined = r.players.white?.userId === userId ? 'white' : r.players.black?.userId === userId ? 'black' : undefined;
      let joined = false;
      if (!color) {
        if (r.status !== 'waiting' || r.players.black) return reject('Room is full or the game has already started');
        if (!this.sockets('white').length) return reject('The room creator is offline. Please try again later.');
        color = 'black';
        r.players.black = { userId, name: decodeURIComponent(request.headers.get('X-Player-Name') ?? 'Player') };
        r.status = 'active';
        r.expiresAt = Date.now() + 86400000;
        joined = true;
      }
      // The latest connection owns the seat; a closed older socket cannot remove it.
      for (const old of this.sockets(color)) old.close(1000, 'Connected from another tab');
      ws.serializeAttachment({ userId, color } satisfies Attachment);
      await this.save();
      this.send(ws, { type: 'connected' });
      if (r.status === 'waiting') this.send(ws, { type: 'room_created', roomId: r.id, color });
      else {
        if (joined) {
          this.send(ws, { type: 'room_joined', roomId: r.id, color, opponentConnected: true });
          for (const peer of this.sockets(opposite(color))) { this.send(peer, { type: 'opponent_joined' }); this.sendStart(peer, opposite(color)); }
        } else for (const peer of this.sockets(opposite(color))) this.send(peer, { type: 'opponent_reconnected' });
        this.sendStart(ws, color);
      }
      return upgrade();
    });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.ctx.blockConcurrencyWhile(async () => {
      if (typeof message !== 'string' || message.length > 2048) { ws.close(1009, 'Message too large'); return; }
      let b: Record<string, unknown>;
      try { b = JSON.parse(message); } catch { this.send(ws, { type: 'error', message: 'Invalid message' }); return; }
      if (!b || typeof b !== 'object') return;
      if (b.type === 'ping') { this.send(ws, { type: 'pong' }); return; }
      const a = ws.deserializeAttachment() as Attachment | null;
      const r = this.room;
      if (!a || !r || r.players[a.color]?.userId !== a.userId || !this.sockets(a.color).includes(ws)) return;
      if (b.roomId !== r.id || r.status !== 'active') { this.send(ws, { type: 'error', message: 'No active game' }); return; }
      const times = this.clock();
      if (r.timeControl && r.lastMoveAt && times[this.game.turn] <= 0) {
        this.finish({ type: 'game_over', winner: opposite(this.game.turn), winReason: 'timeout' });
        await this.save(); this.broadcast(r.result); return;
      }
      if (b.type === 'move') {
        if (this.game.turn !== a.color) { this.send(ws, { type: 'error', message: 'Not your turn' }); this.sendStart(ws, a.color); return; }
        if (typeof b.pieceName !== 'string' || !Number.isInteger(b.position) ||
            (b.promotionRank !== undefined && !['queen', 'rook', 'bishop', 'knight'].includes(String(b.promotionRank)))) {
          this.send(ws, { type: 'error', message: 'Illegal move' }); this.sendStart(ws, a.color); return;
        }
        const move: Move = { pieceName: b.pieceName, position: b.position as number, promotionRank: b.promotionRank as PieceRank | undefined };
        if (!this.game.movePiece(move.pieceName, move.position, move.promotionRank)) { this.send(ws, { type: 'error', message: 'Illegal move' }); this.sendStart(ws, a.color); return; }
        r.moves.push(move);
        r.remaining = times;
        r.lastMoveAt = Date.now();
        delete r.drawOfferedBy;
        await this.save();
        this.broadcast({ type: 'move', roomId: r.id, ...move }, ws);
        if (r.result) this.broadcast(r.result);
        return;
      }
      if (b.type === 'resign') this.finish({ type: 'game_over', winner: opposite(a.color), winReason: 'resignation' });
      else if (b.type === 'draw_offer') {
        r.drawOfferedBy = a.color;
        await this.save();
        this.broadcast({ type: 'draw_offered' }, ws); return;
      } else if (b.type === 'draw_accept' && r.drawOfferedBy && r.drawOfferedBy !== a.color) this.finish({ type: 'game_over', drawReason: 'agreement' });
      else if (b.type === 'draw_decline' && r.drawOfferedBy && r.drawOfferedBy !== a.color) {
        delete r.drawOfferedBy; await this.save(); this.broadcast({ type: 'draw_declined' }, ws); return;
      } else return;
      await this.save();
      if (r.result) this.broadcast(r.result);
    });
  }
  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const a = ws.deserializeAttachment() as Attachment | null;
    if (a && !this.sockets(a.color).some(peer => peer !== ws)) this.broadcast({ type: 'opponent_disconnected' }, ws);
    ws.close([1005, 1006, 1015].includes(code) ? 1000 : code, reason);
  }
  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws, 1011, 'Connection error'); }
  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      const r = this.room;
      if (!r) return;
      if (Date.now() >= r.expiresAt) {
        for (const ws of this.sockets()) ws.close(1000, 'Room expired');
        await this.ctx.storage.deleteAll();
        this.room = undefined;
        this.game = new Game(clonePieces(INITIAL_PIECES), 'white'); this.bindEvents();
        return;
      }
      if (r.status === 'active' && r.timeControl && r.lastMoveAt && this.clock()[this.game.turn] <= 0) {
        this.finish({ type: 'game_over', winner: opposite(this.game.turn), winReason: 'timeout' });
        await this.save(); this.broadcast(r.result);
      } else await this.save();
    });
  }
}
