// SeamRoom — one DO per duel room. Max two sockets (host, guest).
// WebSocket Hibernation API (ctx.acceptWebSocket + webSocketMessage handlers)
// so idle rooms cost nothing between messages — same shape as impostor's rooms.
import { DurableObject } from "cloudflare:workers";

const IDLE_MS = 10 * 60 * 1000; // 10 min without traffic → room dies
const TOUCH_WRITE_INTERVAL = 60 * 1000; // throttle lastActivity storage writes

export class SeamRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.lastTouchWrite = 0;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    // getWebSockets() reflects live sockets even after hibernation.
    const live = this.ctx.getWebSockets();
    if (live.length >= 2) {
      return new Response("room full", { status: 409 });
    }
    const role = live.some((ws) => this.ctx.getTags(ws)[0] === "host")
      ? "guest"
      : "host";

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [role]);

    await this.touch(true);

    server.send(JSON.stringify({ t: "role", role }));
    if (role === "guest") {
      const peer = this.peerOf(server);
      if (peer) this.safeSend(peer, JSON.stringify({ t: "peer-joined" }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  peerOf(ws) {
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) return other;
    }
    return null;
  }

  safeSend(ws, data) {
    try {
      ws.send(data);
    } catch {
      /* peer already gone */
    }
  }

  // Refresh the idle clock; throttled so 30 Hz relay traffic doesn't hammer storage.
  async touch(force = false) {
    const now = Date.now();
    if (!force && now - this.lastTouchWrite < TOUCH_WRITE_INTERVAL) return;
    this.lastTouchWrite = now;
    await this.ctx.storage.put("lastActivity", now);
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null) await this.ctx.storage.setAlarm(now + IDLE_MS);
  }

  async webSocketMessage(ws, message) {
    await this.touch();
    // Client keepalive — swallow, don't relay.
    if (message === '{"t":"hb"}') return;
    // Everything else (JSON signaling + binary relay packets) relays verbatim.
    const peer = this.peerOf(ws);
    if (peer) this.safeSend(peer, message);
  }

  async webSocketClose(ws) {
    const peer = this.peerOf(ws);
    if (peer) this.safeSend(peer, JSON.stringify({ t: "peer-left" }));
  }

  async webSocketError(ws) {
    const peer = this.peerOf(ws);
    if (peer) this.safeSend(peer, JSON.stringify({ t: "peer-left" }));
  }

  async alarm() {
    const last = (await this.ctx.storage.get("lastActivity")) || 0;
    const idleFor = Date.now() - last;
    if (idleFor >= IDLE_MS) {
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.close(1000, "room expired");
        } catch {
          /* already closed */
        }
      }
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(last + IDLE_MS);
    }
  }
}
