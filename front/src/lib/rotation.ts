/** Where the admin-set rotation period lives — the API has no field for it (backend frozen). */
const ROTATION_STORAGE_KEY = 'jahez.ad_rotation_seconds';
export const DEFAULT_ROTATION_SECONDS = 5;
export const MIN_ROTATION_SECONDS = 2;
export const MAX_ROTATION_SECONDS = 120;

/** The admin's rotation period in seconds (AdsManagement); defaults when unset or out of range. */
export const readRotationSeconds = (): number => {
  try {
    const parsed = Number.parseInt(window.localStorage.getItem(ROTATION_STORAGE_KEY) ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= MIN_ROTATION_SECONDS && parsed <= MAX_ROTATION_SECONDS) return parsed;
  } catch {
    /* storage unavailable (private mode) — keep the default */
  }
  return DEFAULT_ROTATION_SECONDS;
};

/** Persist the period chosen by the admin; failures are silent (the slider keeps its current value). */
export const saveRotationSeconds = (seconds: number): void => {
  try {
    window.localStorage.setItem(ROTATION_STORAGE_KEY, String(seconds));
  } catch {
    /* ignore quota/private-mode errors */
  }
};
