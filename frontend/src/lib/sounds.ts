let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playMoveSound() {
  tone(320, 0.08, "triangle", 0.06);
}

export function playCaptureSound() {
  tone(180, 0.05, "square", 0.1);
  setTimeout(() => tone(120, 0.12, "sawtooth", 0.08), 40);
}

export function playCheckSound() {
  tone(520, 0.1, "sine", 0.09);
  setTimeout(() => tone(620, 0.1, "sine", 0.07), 80);
}

export function playCheckmateSound() {
  [400, 500, 600, 750].forEach((f, i) => {
    setTimeout(() => tone(f, 0.15, "sine", 0.1), i * 100);
  });
}

export function playDrawSound() {
  tone(300, 0.2, "triangle", 0.06);
  setTimeout(() => tone(250, 0.2, "triangle", 0.05), 150);
}

export function playHintSound() {
  tone(440, 0.06, "sine", 0.05);
  setTimeout(() => tone(550, 0.08, "sine", 0.05), 60);
}
