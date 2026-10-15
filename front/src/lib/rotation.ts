import type { LandingSettings } from '../api/types';

/**
 * Seconds each landing ad slide stays on screen. The admin sets it in AdsManagement and the
 * API stores it with the landing settings (`ad_rotation_seconds`), so every visitor gets the
 * same period. The bounds match the API's validation.
 */
export const DEFAULT_ROTATION_SECONDS = 5;
export const MIN_ROTATION_SECONDS = 2;
export const MAX_ROTATION_SECONDS = 120;

/** The admin's rotation period, or the default when unset or out of range. */
export const rotationSeconds = (settings: Pick<LandingSettings, 'ad_rotation_seconds'> | null): number => {
  const value = settings?.ad_rotation_seconds ?? null;
  return value !== null && Number.isInteger(value) && value >= MIN_ROTATION_SECONDS && value <= MAX_ROTATION_SECONDS
    ? value
    : DEFAULT_ROTATION_SECONDS;
};
