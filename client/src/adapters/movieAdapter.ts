import type { Card } from '../../event_types/card';
import type { MovieRecord } from '../apis/movies';

type MovieCardOptions = {
  limit?: number | null;
  shuffle?: boolean;
};

export function adaptMoviesToCards(movies: MovieRecord[], options: MovieCardOptions = {}): Card[] {
  const { limit = 6, shuffle = true } = options;
  // Shuffling keeps the suggestions feeling fresh when the same query is run again.
  const orderedMovies = shuffle ? [...movies].sort(() => Math.random() - 0.5) : [...movies];
  const selectedMovies = typeof limit === 'number' ? orderedMovies.slice(0, limit) : orderedMovies;

  return selectedMovies.map((movie) => {
    const offerProviders = [...new Set(movie.offers.map((offer: { name: any; }) => offer.name))];
    const availability = offerProviders.slice(0, 4).join(', ');

    return {
      id: crypto.randomUUID(),
      type: 'movie' as const,
      source: movie.justWatchUrl ? ('JustWatch' as const) : ('IMDb' as const),
      title: movie.title,
      subtitle: [
        movie.year,
        movie.runtime ? `${movie.runtime} min` : null,
      ].filter(Boolean).join(' · '),
      summary: movie.justWatchUrl
        ? (
            [
              movie.rating != null ? `JustWatch score ${(movie.rating * 100).toFixed(0)}%` : null,
              movie.tomatoMeter != null ? `TomatoMeter ${movie.tomatoMeter}%` : null,
              availability ? `Available on ${availability}` : null,
            ].filter(Boolean).join('. ') || movie.actors || 'JustWatch movie result.'
        )
        : (movie.actors ?? 'Movie search result from IMDb.'),
      icon: 'film',
      image: movie.poster ?? null,
      priority: 'suggestion' as const,
      tags: [
        'movie',
        movie.imdbId ? 'imdb' : 'search',
        movie.justWatchUrl ? 'justwatch' : 'catalog',
      ],
      fields: [
        { label: 'Year', value: movie.year ? String(movie.year) : 'Unknown' },
        { label: 'IMDb ID', value: movie.imdbId ?? 'Unknown' },
        { label: 'Actors', value: movie.actors ?? 'N/A' },
        { label: 'Runtime', value: movie.runtime ? `${movie.runtime} min` : 'N/A' },
        { label: 'Offer Count', value: String(movie.offers.length) },
        { label: 'Top Offers', value: availability || 'N/A' },
      ],
      rawRef: {
        // Preserve the original provider link so the UI can open the source without extra lookup work.
        providerId: movie.id,
        externalUrl: movie.justWatchUrl ?? movie.imdbUrl ?? null,
      },
    };
  });
}
