export const GAME_SFX_EVENT = {
  PLACE: "place",
  REMOVE: "remove",
  VICTORY: "victory",
  DEFEAT: "defeat",
  DRAW: "draw",
} as const;

export type GameSfxEvent = (typeof GAME_SFX_EVENT)[keyof typeof GAME_SFX_EVENT];

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

function playTone(params: {
  frequency: number;
  durationMs: number;
  gain: number;
  type?: OscillatorType;
  delayMs?: number;
}) {
  const { frequency, durationMs, gain, type = "sine", delayMs = 0 } = params;
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime + delayMs / 1000;
  const duration = durationMs / 1000;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export function playGameSfx(event: GameSfxEvent, enabled: boolean) {
  if (!enabled) {
    return;
  }

  if (event === GAME_SFX_EVENT.PLACE) {
    playTone({ frequency: 420, durationMs: 60, gain: 0.035, type: "triangle" });
    return;
  }

  if (event === GAME_SFX_EVENT.REMOVE) {
    playTone({ frequency: 340, durationMs: 70, gain: 0.045, type: "square" });
    playTone({ frequency: 260, durationMs: 80, gain: 0.032, type: "square", delayMs: 45 });
    return;
  }

  if (event === GAME_SFX_EVENT.VICTORY) {
    playTone({ frequency: 520, durationMs: 100, gain: 0.04, type: "triangle" });
    playTone({ frequency: 660, durationMs: 120, gain: 0.04, type: "triangle", delayMs: 100 });
    playTone({ frequency: 820, durationMs: 140, gain: 0.04, type: "triangle", delayMs: 220 });
    return;
  }

  if (event === GAME_SFX_EVENT.DEFEAT) {
    playTone({ frequency: 320, durationMs: 110, gain: 0.042, type: "sawtooth" });
    playTone({ frequency: 240, durationMs: 150, gain: 0.042, type: "sawtooth", delayMs: 120 });
    return;
  }

  playTone({ frequency: 420, durationMs: 90, gain: 0.035, type: "sine" });
  playTone({ frequency: 360, durationMs: 120, gain: 0.03, type: "sine", delayMs: 95 });
}
