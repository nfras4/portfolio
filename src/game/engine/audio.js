// SEAM sounds — tiny WebAudio synth blips, all generated in code. No files.
let ac = null;

export function ensureAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch {
    ac = null; // audio is decorative; never fatal
  }
}

function blip({ type = "sine", from = 440, to = from, dur = 0.08, gain = 0.08, delay = 0 }) {
  if (!ac || ac.state !== "running") return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  // fire: square zap, pitch scales with charge
  fire(charge = 0) {
    blip({ type: "square", from: 320 + 260 * charge, to: 120, dur: 0.09, gain: 0.06 });
  },
  // seam-cross tick: short high sine
  tick() {
    blip({ type: "sine", from: 1250, to: 1100, dur: 0.045, gain: 0.045 });
  },
  // hit thud: low drop
  thud() {
    blip({ type: "triangle", from: 180, to: 46, dur: 0.28, gain: 0.16 });
    blip({ type: "square", from: 90, to: 40, dur: 0.2, gain: 0.07 });
  },
  // countdown beeps: 3-2-1 same tone, "go" a fifth up
  beep(final = false) {
    blip({ type: "sine", from: final ? 990 : 660, dur: final ? 0.16 : 0.09, gain: 0.07 });
  },
  win() {
    blip({ type: "sine", from: 660, to: 660, dur: 0.09, gain: 0.06 });
    blip({ type: "sine", from: 880, to: 880, dur: 0.12, gain: 0.06, delay: 0.1 });
  },
  lose() {
    blip({ type: "sine", from: 440, to: 220, dur: 0.25, gain: 0.06 });
  },
};
