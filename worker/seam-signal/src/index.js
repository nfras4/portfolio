// seam-signal worker entry: routes /room/<id> WebSocket upgrades to the SeamRoom DO.
// Hand-written entry (no build step) — DO class must be a named export of this module.
import { SeamRoom } from "./room.js";
export { SeamRoom };

// Cross-Site WebSocket Hijacking guard: SameSite cookies don't cover WS upgrades,
// so gate on Origin. Prod site + localhost/LAN dev origins only.
const ORIGIN_ALLOW = [
  /^https:\/\/nickwfraser\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)?nickwfraser-portfolio\.pages\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([a-z0-9]{8,64})$/);
    if (!match) return new Response("not found", { status: 404 });

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const origin = request.headers.get("Origin") || "";
    if (!ORIGIN_ALLOW.some((re) => re.test(origin))) {
      return new Response("forbidden origin", { status: 403 });
    }

    const id = env.SEAM_ROOM.idFromName(match[1]);
    return env.SEAM_ROOM.get(id).fetch(request);
  },
};
