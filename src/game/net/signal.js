// SignalClient — the WebSocket to the seam-signal worker.
// Carries JSON signaling ({t:"offer"|"answer"|"ice"|"ready"|"role"|"peer-joined"|
// "peer-left"|"relay"}) and, in relay mode, raw binary state packets.
import { slog } from "./log.js";

// Deployed 2026-08-13: `bunx wrangler deploy --config worker/seam-signal/wrangler.jsonc`
export const SIGNAL_URL = import.meta.env.DEV
  ? `ws://${location.hostname}:8787`
  : "wss://seam-signal.nickwfraser-b09.workers.dev";

const HB_INTERVAL = 30_000; // keepalive so the DO's 10-min idle alarm never fires mid-match

export class SignalClient {
  constructor() {
    this.ws = null;
    this.role = null;
    this.onJson = null; // (msg) => void — every parsed JSON message
    this.onBinary = null; // (ArrayBuffer) => void — relay-mode state packets
    this.onClose = null;
    this._hb = null;
  }

  connect(roomId) {
    slog("signal:connect", { roomId });
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${SIGNAL_URL}/room/${roomId}`);
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      let settled = false;

      ws.onopen = () => {
        slog("signal:open", { roomId });
        this._hb = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('{"t":"hb"}');
        }, HB_INTERVAL);
      };

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") {
          this.onBinary?.(e.data);
          return;
        }
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.t === "role" && !settled) {
          settled = true;
          this.role = msg.role;
          slog("signal:role", { role: msg.role });
          resolve(msg.role);
          return;
        }
        this.onJson?.(msg);
      };

      ws.onerror = () => {
        slog("signal:error", { settled });
        if (!settled) {
          settled = true;
          reject(new Error("signal connect failed"));
        }
      };

      ws.onclose = (e) => {
        slog("signal:close", { code: e.code, reason: e.reason, settled });
        clearInterval(this._hb);
        if (!settled) {
          settled = true;
          reject(new Error("signal closed before role (room full?)"));
        } else {
          this.onClose?.();
        }
      };
    });
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  sendBinary(buf) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(buf);
  }

  close() {
    clearInterval(this._hb);
    if (this.ws) {
      // Null every handler so an in-flight connect() never settles and no
      // stale callbacks fire (React StrictMode double-mounts in dev).
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        /* already closed */
      }
      this.ws = null;
    }
  }
}
