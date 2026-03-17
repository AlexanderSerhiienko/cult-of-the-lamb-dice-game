const SOUND_ENABLED_STORAGE_KEY = "knucklebones.soundEnabled";

function getStorage(): Storage | null {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage === "undefined" ||
    typeof window.localStorage.getItem !== "function" ||
    typeof window.localStorage.setItem !== "function"
  ) {
    return null;
  }

  return window.localStorage;
}

export function readSoundEnabled(): boolean {
  const storage = getStorage();
  if (!storage) {
    return true;
  }

  const raw = storage.getItem(SOUND_ENABLED_STORAGE_KEY);
  if (raw === null) {
    return true;
  }

  return raw !== "false";
}

export function writeSoundEnabled(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
}
