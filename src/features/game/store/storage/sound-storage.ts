const SOUND_ENABLED_STORAGE_KEY = "knucklebones.soundEnabled";

export function readSoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const raw = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
  if (raw === null) {
    return true;
  }

  return raw !== "false";
}

export function writeSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
}
