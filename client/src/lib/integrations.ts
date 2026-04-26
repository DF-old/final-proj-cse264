export const FREE_INTEGRATIONS  = ['weather', 'holidays', 'location'] as const;
export const PREMIUM_INTEGRATIONS = [...FREE_INTEGRATIONS, 'nba', 'nfl', 'mlb', 'movies'] as const;

export type Integration = typeof PREMIUM_INTEGRATIONS[number];

export const integrationsForTier = (tier: 'free' | 'premium'): Integration[] =>
  tier === 'premium' ? [...PREMIUM_INTEGRATIONS] : [...FREE_INTEGRATIONS];
