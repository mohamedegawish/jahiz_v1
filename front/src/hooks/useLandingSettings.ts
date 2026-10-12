import { api, type LandingSettings } from '../api';
import { useApiQuery } from './useApiQuery';

/**
 * The admin-managed landing content (logo, hero texts, section texts, FAQ).
 * Null while loading or when unreachable: every caller falls back to the
 * bundled copy (lib/landingDefaults), so the landing never breaks.
 */
export function useLandingSettings(): LandingSettings | null {
  const query = useApiQuery((signal) => api.landing.publicContent(signal), []);
  return query.data ?? null;
}
