import { api, type LandingSettings } from '../api';
import { cachedReference } from '../lib/referenceCache';
import { useApiQuery } from './useApiQuery';

/**
 * The admin-managed landing content (logo, hero texts, section texts, FAQ, ad rotation).
 * Null while loading or when unreachable: every caller falls back to the bundled copy
 * (lib/landingDefaults), so the landing never breaks. One request is shared by every
 * caller on the page (the layout, the hero, the ad sliders); the admin editor reads its
 * own fresh copy.
 */
export function useLandingSettings(): LandingSettings | null {
  const query = useApiQuery(() => cachedReference('public-landing', () => api.landing.publicContent()), []);
  return query.data ?? null;
}
