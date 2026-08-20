/**
 * welcomeSpeech.ts - Personalised voice greeting with Web Speech API + Web Audio chime
 */

function playLoginChime(gender: 'male' | 'female'): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = gender === 'female'
      ? [523.25, 659.25, 783.99, 1046.50]
      : [261.63, 329.63, 392.00, 523.25];
    const now = ctx.currentTime;
    const dur = 0.13;
    const gap = 0.04;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = gender === 'female' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * (dur + gap));
      const s = now + i * (dur + gap);
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(0.30, s + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s);
      osc.stop(s + dur);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch { /* ignore */ }
}

function pickVoice(voices: SpeechSynthesisVoice[], gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const locales = ['en-IN', 'en-GB', 'en-US', 'en'];
  if (gender === 'female') {
    const kw = ['female', 'woman', 'girl', 'zira', 'samantha', 'siri', 'victoria', 'moira', 'fiona', 'google uk english female'];
    for (const l of locales) { const m = voices.find(v => v.lang.startsWith(l) && kw.some(k => v.name.toLowerCase().includes(k))); if (m) return m; }
    const f = voices.find(v => kw.some(k => v.name.toLowerCase().includes(k)));
    if (f) return f;
  } else {
    const kw = ['male', 'man', 'david', 'alex', 'daniel', 'reed', 'mark', 'james', 'google uk english male'];
    for (const l of locales) { const m = voices.find(v => v.lang.startsWith(l) && kw.some(k => v.name.toLowerCase().includes(k))); if (m) return m; }
    const f = voices.find(v => kw.some(k => v.name.toLowerCase().includes(k)));
    if (f) return f;
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

export function playWelcomeSpeech(
  employeeName: string,
  gender: 'male' | 'female' = 'female',
  delayMs = 500
): void {
  playLoginChime(gender);
  setTimeout(() => {
    if (!window.speechSynthesis) return;
    const firstName = employeeName.split(' ')[0];
    const text = `Welcome back, ${firstName}! Your work session has started. Have a great and productive day!`;
    const speak = (voices: SpeechSynthesisVoice[]) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(voices, gender);
      if (v) u.voice = v;
      u.lang = 'en-IN';
      u.rate = gender === 'female' ? 0.95 : 0.88;
      u.pitch = gender === 'female' ? 1.15 : 0.82;
      u.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { speak(voices); }
    else { window.speechSynthesis.onvoiceschanged = () => { speak(window.speechSynthesis.getVoices()); window.speechSynthesis.onvoiceschanged = null; }; }
  }, delayMs);
}
