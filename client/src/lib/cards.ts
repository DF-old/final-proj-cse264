// contains the main search logic for fetching and adapting data from various APIs into a unified Card format.
import type { Card } from '../event_types/card';
import type { User } from '../event_types/user';
import type { EventDraft } from '../event_types/event';

// serves as the central hub for all card search functionality
import { geocodeLocation, fetchOpenMeteoForecast, fetchNWSForecast } from './apis/weather';
import { fetchScoreboard } from './apis/sports';
import { searchMovies } from './apis/movies';
import { fetchPublicHolidays, findNearbyHolidays } from './apis/holidays';
import { searchLocation } from './apis/location';

// adapter functions convert raw API responses into the Card format expected by the planner UI
import { adaptOpenMeteoToCards, adaptNWSToCards } from './adapters/weatherAdapter';
import { adaptSportsEventsToCards } from './adapters/sportsAdapter';
import { adaptMoviesToCards } from './adapters/movieAdapter';
import { adaptHolidaysToCards } from './adapters/holidayAdapter';
import { adaptNominatimToCards } from './adapters/locationAdapter';

export async function fetchCardsForEvent(event: Partial<EventDraft>, user: User): Promise<Card[]> {
  const cards: Card[] = [];
  const isPremium = user.tier === 'premium';

  const fetchTasks: Promise<Card[]>[] = [];

  if (event.location) {
    // Location-based enrichment is split into multiple sources so one API can
    // fail without blocking the others.
    fetchTasks.push(
      (async () => {
        const loc = await geocodeLocation(event.location!);
        if (!loc) return [];
        const result: Card[] = [];

        const forecast = await fetchOpenMeteoForecast(loc.latitude, loc.longitude);
        if (forecast) result.push(...adaptOpenMeteoToCards(forecast, loc.name));

        const nws = await fetchNWSForecast(loc.latitude, loc.longitude);
        if (nws) result.push(...adaptNWSToCards(nws).slice(0, 2));

        return result;
      })()
    );

    fetchTasks.push(
      (async () => {
        const results = await searchLocation(event.location!);
        return adaptNominatimToCards(results).slice(0, 2);
      })()
    );
  }

  if (event.date) {
    // Date-specific cards are pulled from holiday data, which helps the user
    // see conflicts or relevant calendar context.
    fetchTasks.push(
      (async () => {
        const year = new Date(event.date!).getFullYear();
        const holidays = await fetchPublicHolidays(year);
        const nearby = findNearbyHolidays(holidays, event.date!);
        return adaptHolidaysToCards(nearby).slice(0, 4);
      })()
    );
  } else {
    fetchTasks.push(
      (async () => {
        const year = new Date().getFullYear();
        const holidays = await fetchPublicHolidays(year);
        return adaptHolidaysToCards(holidays).slice(0, 3);
      })()
    );
  }

  if (isPremium) {
    // Premium users get additional enrichment sources that make the event
    // planner feel more like a concierge than a plain form.
    fetchTasks.push(
      (async () => adaptSportsEventsToCards(await fetchScoreboard('nba'), 'nba').slice(0, 2))()
    );
    fetchTasks.push(
      (async () => adaptSportsEventsToCards(await fetchScoreboard('mlb'), 'mlb').slice(0, 2))()
    );
    fetchTasks.push(
      (async () => adaptSportsEventsToCards(await fetchScoreboard('nfl'), 'nfl').slice(0, 2))()
    );
    fetchTasks.push(
      (async () => {
        const query = [event.title, event.category, event.notes]
          .filter(Boolean)
          .join(' ')
          .trim();
        const searchTerm = query || 'movie';
        const movies = await searchMovies(searchTerm);
        return adaptMoviesToCards(movies).slice(0, 3);
      })()
    );
  }

  const results = await Promise.allSettled(fetchTasks);
  for (const r of results) {
    if (r.status === 'fulfilled') cards.push(...r.value);
  }

  // Promise.allSettled lets the app keep partial results even if one source
  // times out or returns an error.
  return cards;
}