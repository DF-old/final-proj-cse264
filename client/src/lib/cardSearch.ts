import type { Card } from '../event_types/card';
import type { User } from '../event_types/user';

import { geocodeLocations, fetchOpenMeteoForecast, fetchNWSForecast } from './apis/weather';
import { fetchScoreboard, findEventsForTeam, type SportLeague } from './apis/sports';
import { searchMovies } from './apis/movies';
import { fetchPublicHolidays } from './apis/holidays';
import { searchLocation } from './apis/location';

import { adaptOpenMeteoToCards, adaptNWSToCards } from './adapters/weatherAdapter';
import { adaptTeamMatchesToCards } from './adapters/sportsAdapter';
import { adaptMoviesToCards } from './adapters/movieAdapter';
import { adaptHolidaysToCards } from './adapters/holidayAdapter';
import { adaptNominatimToCards } from './adapters/locationAdapter';

export type CardSearchSource = 'weather' | 'location' | 'nba' | 'nfl' | 'mlb' | 'movie' | 'holiday';

const normalize = (value: string) => value.trim().toLowerCase();

export async function searchWeatherCards(query: string): Promise<Card[]> {
  const cards: Card[] = [];
  // Weather search first resolves locations, then enriches each location with forecast cards.
  const locations = await geocodeLocations(query);
  if (locations.length === 0) return cards;

  const results = await Promise.allSettled(
    locations.map(async (location) => {
      const locationCards: Card[] = [];

      const forecast = await fetchOpenMeteoForecast(location.latitude, location.longitude);
      if (forecast) locationCards.push(...adaptOpenMeteoToCards(forecast, location.name));

      const nws = await fetchNWSForecast(location.latitude, location.longitude);
      if (nws) locationCards.push(...adaptNWSToCards(nws));

      return locationCards;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') cards.push(...result.value);
  }

  return cards;
}

export async function searchLocationCards(query: string): Promise<Card[]> {
  const results = await searchLocation(query);
  return adaptNominatimToCards(results);
}

export async function searchSportsCards(query: string, user: User, league: SportLeague): Promise<Card[]> {
  if (user.tier !== 'premium') return [];

  // Sports search is premium-only because it uses the higher-tier enrichment flow.
  const events = await fetchScoreboard(league);
  if (!query.trim()) {
    return adaptTeamMatchesToCards(events.map((event) => ({ league, event })));
  }
  const matches = findEventsForTeam(events, query, league);
  return adaptTeamMatchesToCards(matches);
}

export async function searchMovieCards(query: string, user: User): Promise<Card[]> {
  if (user.tier !== 'premium') return [];

  // Default to a broad query so empty searches still produce useful movie suggestions.
  const movies = await searchMovies(query.trim() || 'movie');
  return adaptMoviesToCards(movies, { limit: null, shuffle: false });
}

export async function searchHolidayCards(query: string): Promise<Card[]> {
  const q = normalize(query);
  const yearMatch = q.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
  const holidays = await fetchPublicHolidays(year);
  const filtered = q
    ? holidays.filter((holiday) => {
        const haystack = [
          holiday.name,
          holiday.localName,
          holiday.countryCode,
          holiday.types.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : holidays;

  return adaptHolidaysToCards(filtered);
}

export async function searchCardsBySource(
  source: CardSearchSource,
  query: string,
  user: User
): Promise<Card[]> {
  const trimmed = query.trim();

  // Keep the source-specific logic in one place so the UI only has to select a source and query.
  switch (source) {
    case 'weather':
      if (!trimmed) return [];
      return searchWeatherCards(trimmed);
    case 'location':
      if (!trimmed) return [];
      return searchLocationCards(trimmed);
    case 'nba':
      return searchSportsCards(trimmed, user, 'nba');
    case 'nfl':
      return searchSportsCards(trimmed, user, 'nfl');
    case 'mlb':
      return searchSportsCards(trimmed, user, 'mlb');
    case 'movie':
      return searchMovieCards(trimmed, user);
    case 'holiday':
      return searchHolidayCards(trimmed);
    default:
      return [];
  }
}
