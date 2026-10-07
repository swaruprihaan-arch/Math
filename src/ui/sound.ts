/**
 * Tiny synthesized sound effects (Web Audio) — no audio files, nothing to download.
 */
type Effect = 'snap' | 'correct' | 'wrong' | 'celebrate' | 'tap';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  gain.gain.setValueAtTime(0.0001, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), a.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + duration + 0.02);
}

export function play(effect: Effect, volume: number): void {
  if (volume <= 0) return;
  const a = audio();
  if (!a) return;
  const v = 0.25 * volume;
  switch (effect) {
    case 'tap':
      tone(a, 660, 0, 0.05, v * 0.5, 'triangle');
      break;
    case 'snap':
      tone(a, 220, 0, 0.06, v, 'square');
      tone(a, 440, 0.03, 0.05, v * 0.6, 'triangle');
      break;
    case 'correct':
      tone(a, 523.25, 0, 0.14, v);
      tone(a, 659.25, 0.1, 0.14, v);
      tone(a, 783.99, 0.2, 0.22, v);
      break;
    case 'wrong':
      tone(a, 300, 0, 0.16, v * 0.8, 'triangle');
      tone(a, 240, 0.12, 0.22, v * 0.8, 'triangle');
      break;
    case 'celebrate':
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(a, f, i * 0.09, 0.16, v));
      break;
  }
}
