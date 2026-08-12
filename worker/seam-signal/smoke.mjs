// Smoke test for seam-signal (run with: bun worker/seam-signal/smoke.mjs)
// Requires wrangler dev on :8787. Checks: role assignment, verbatim relay
// (JSON + binary), third-socket rejection, peer-left notification, bad origin.
const BASE = "ws://127.0.0.1:8787";
const ORIGIN = { headers: { Origin: "http://localhost:5173" } };
const roomId = Math.random().toString(36).slice(2, 12) + "abcd";

let failures = 0;
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failures++;
}

function connect(opts = ORIGIN) {
  const ws = new WebSocket(`${BASE}/room/${roomId}`, opts);
  ws.binaryType = "arraybuffer";
  const queue = [];
  const waiters = [];
  ws.onmessage = (e) => {
    if (waiters.length) waiters.shift()(e.data);
    else queue.push(e.data);
  };
  ws.next = (timeout = 4000) =>
    new Promise((resolve, reject) => {
      if (queue.length) return resolve(queue.shift());
      const t = setTimeout(() => reject(new Error("timeout waiting for message")), timeout);
      waiters.push((d) => {
        clearTimeout(t);
        resolve(d);
      });
    });
  ws.opened = new Promise((resolve, reject) => {
    ws.onopen = () => resolve(true);
    ws.onerror = () => resolve(false);
    ws.onclose = () => resolve(false);
  });
  return ws;
}

// 1. host joins, gets role host
const host = connect();
check("host socket opens", await host.opened);
const roleMsg = JSON.parse(await host.next());
check("host gets role=host", roleMsg.t === "role" && roleMsg.role === "host");

// 2. guest joins: gets role guest, host gets peer-joined
const guest = connect();
check("guest socket opens", await guest.opened);
const guestRole = JSON.parse(await guest.next());
check("guest gets role=guest", guestRole.t === "role" && guestRole.role === "guest");
const joined = JSON.parse(await host.next());
check("host notified peer-joined", joined.t === "peer-joined");

// 3. JSON relays verbatim guest -> host
guest.send(JSON.stringify({ t: "offer", sdp: "fake-sdp-payload" }));
const offer = JSON.parse(await host.next());
check("JSON relays verbatim", offer.t === "offer" && offer.sdp === "fake-sdp-payload");

// 4. binary relays verbatim host -> guest
const bin = new Uint8Array([1, 0, 7, 66, 12, 204, 205, 61, 35, 51, 51, 63, 0, 0, 0]);
host.send(bin.buffer);
const got = await guest.next();
const gotBytes = new Uint8Array(got);
check(
  "binary relays verbatim",
  got instanceof ArrayBuffer &&
    gotBytes.length === bin.length &&
    gotBytes.every((b, i) => b === bin[i])
);

// 5. heartbeat is swallowed, not relayed
host.send('{"t":"hb"}');
host.send(JSON.stringify({ t: "ice", c: "after-hb" }));
const afterHb = JSON.parse(await guest.next());
check("hb swallowed (next msg is ice)", afterHb.t === "ice" && afterHb.c === "after-hb");

// 6. third client rejected
const third = connect();
const thirdOpened = await third.opened;
check("third socket rejected", thirdOpened === false);

// 7. bad origin rejected
const evil = connect({ headers: { Origin: "https://evil.example.com" } });
check("bad origin rejected", (await evil.opened) === false);

// 8. guest close -> host gets peer-left
guest.close();
const left = JSON.parse(await host.next());
check("host notified peer-left", left.t === "peer-left");

host.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
