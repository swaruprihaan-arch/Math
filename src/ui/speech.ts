/**
 * Read-aloud with the browser's built-in speech synthesis (no external service).
 */
export function canSpeak(): boolean {
  return typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
}

export function speak(text: string, rate = 0.95): void {
  if (!canSpeak() || !text) return;
  try {
    globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1.05;
    const voices = globalThis.speechSynthesis.getVoices();
    const english = voices.find((v) => /^en(-|_)US/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang));
    if (english) u.voice = english;
    globalThis.speechSynthesis.speak(u);
  } catch {
    /* speech is optional */
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) globalThis.speechSynthesis.cancel();
}
