// Lightweight pairing/handshake logger. Every entry lands in a ring buffer at
// window.__seamLog (readable from a phone via remote inspector or the
// console) and echoes to console.info, so a failed pairing is diagnosable
// after the fact without a debug build.
const MAX = 150;

export function slog(tag, data) {
  try {
    const buf = (window.__seamLog = window.__seamLog || []);
    buf.push({ at: new Date().toISOString().slice(11, 23), tag, ...(data || {}) });
    if (buf.length > MAX) buf.shift();
    console.info(`[seam] ${tag}`, data || "");
  } catch {
    /* logging must never break the game */
  }
}
