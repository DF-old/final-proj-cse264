export interface ImdbSearchItem {
  '#TITLE': string;
  '#YEAR'?: number;
  '#IMDB_ID': string;
  '#RANK'?: number;
  '#ACTORS'?: string;
  '#AKA'?: string;
  '#IMDB_URL'?: string;
  '#IMDB_IV'?: string;
  '#IMG_POSTER'?: string;
  photo_width?: number;
  photo_height?: number;
}

export interface ImdbSearchResponse {
  ok: boolean;
  description?: ImdbSearchItem[];
  error_code?: number;
  usage?: string;
  info?: string;
  error?: string;
}

export interface JustWatchOffer {
  type: string;
  name: string;
  url: string;
}

export interface JustWatchMovie {
  id: string;
  type: string;
  url: string;
  title: string;
  year?: number;
  runtime?: number;
  photo_url?: string[];
  backdrops?: string[];
  tmdbId?: string;
  imdbId?: string;
  jwRating?: number;
  tomatoMeter?: number;
  tomatoCertifiedFresh?: boolean | null;
  offers?: JustWatchOffer[];
}

export interface MovieRecord {
  id: string;
  title: string;
  year?: number;
  imdbId?: string;
  imdbUrl?: string;
  justWatchUrl?: string;
  actors?: string;
  poster?: string;
  runtime?: number;
  rating?: number;
  tomatoMeter?: number;
  offers: JustWatchOffer[];
}

// Normalizes movie keys for merging records from different sources
const normalizeMovieKey = (title: string, year?: number) =>
  `${title.trim().toLowerCase()}::${year ?? ''}`;


// Fetches movie search results
export async function fetchImdbMovies(query: string): Promise<ImdbSearchItem[]> {
  const url = `https://imdb.iamidiotareyoutoo.com/search?q=${encodeURIComponent(query)}&v=1`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: ImdbSearchResponse = await res.json();
  return data.ok ? data.description ?? [] : [];
}

// Fetches movie search results from JustWatch
export async function fetchJustWatchMovies(query: string, locale = 'en_IN'): Promise<JustWatchMovie[]> {
  const url = `https://imdb.iamidiotareyoutoo.com/justwatch?q=${encodeURIComponent(query)}&L=${encodeURIComponent(locale)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.ok ? data.description ?? [] : [];
}


// Searches for movies across multiple sources and merges the results into a single record set for easier rendering in the UI
export async function searchMovies(query: string): Promise<MovieRecord[]> {
  const [imdbResults, justWatchResults] = await Promise.all([
    fetchImdbMovies(query),
    fetchJustWatchMovies(query),
  ]);

  // Merge the two movie feeds into one record set so the UI only has to render
  // a single movie card shape.
  const merged = new Map<string, MovieRecord>();

  for (const item of imdbResults) {
    const key = item['#IMDB_ID'] || normalizeMovieKey(item['#TITLE'], item['#YEAR']);
    merged.set(key, {
      id: key,
      title: item['#TITLE'],
      year: item['#YEAR'],
      imdbId: item['#IMDB_ID'],
      imdbUrl: item['#IMDB_URL'],
      actors: item['#ACTORS'],
      poster: item['#IMG_POSTER'],
      offers: [],
    });
  }

  for (const item of justWatchResults) {
    const key = item.imdbId || normalizeMovieKey(item.title, item.year);
    const existing = merged.get(key);
    const movie: MovieRecord = existing
      ? {
          ...existing,
          title: existing.title || item.title,
          year: existing.year ?? item.year,
          imdbId: existing.imdbId ?? item.imdbId,
          justWatchUrl: item.url,
          poster: existing.poster ?? item.photo_url?.[0],
          runtime: existing.runtime ?? item.runtime,
          rating: existing.rating ?? item.jwRating,
          tomatoMeter: existing.tomatoMeter ?? item.tomatoMeter,
          offers: [...existing.offers, ...(item.offers ?? [])],
        }
      : {
          id: key,
          title: item.title,
          year: item.year,
          imdbId: item.imdbId,
          justWatchUrl: item.url,
          poster: item.photo_url?.[0],
          runtime: item.runtime,
          rating: item.jwRating,
          tomatoMeter: item.tomatoMeter,
          offers: item.offers ?? [],
        };
    merged.set(key, movie);
  }

  return [...merged.values()];
}