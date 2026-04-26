import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Download,
  Copy,
  Check,
  Loader2,
  Crown,
} from 'lucide-react';
import { useAuth } from '../auth/Auth';
import { fetchCardsForEvent } from '../lib/cards';
import { searchCardsBySource, type CardSearchSource } from '../lib/cardSearch';
import { downloadICS, copyEventDetails } from '../lib/export';
import { formatNominatimAddress, reverseGeocode } from '../lib/apis/location';
import { CardItem } from '../components/CardItem';
import type { EventDraft, EventCategory } from '../event_types/event';
import type { Card, CardType } from '../event_types/card';
import API from '../lib/server';

const CATEGORIES: EventCategory[] = [
  'Meeting', 'Party', 'Sports', 'Movie Night', 'Outdoor', 'Travel', 'Birthday', 'Other',
];

const CARD_TYPES: { type: CardType | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'weather', label: 'Weather' },
  { type: 'nba', label: 'NBA' },
  { type: 'nfl', label: 'NFL' },
  { type: 'mlb', label: 'MLB' },
  { type: 'movie', label: 'Movies' },
  { type: 'holiday', label: 'Holidays' },
  { type: 'location', label: 'Venues' },
];

const SEARCH_SOURCES: { type: CardSearchSource; label: string; premiumOnly?: boolean }[] = [
  { type: 'weather', label: 'Weather' },
  { type: 'location', label: 'Venues' },
  { type: 'holiday', label: 'Holidays' },
  { type: 'nba', label: 'NBA', premiumOnly: true },
  { type: 'nfl', label: 'NFL', premiumOnly: true },
  { type: 'mlb', label: 'MLB', premiumOnly: true },
  { type: 'movie', label: 'Movies', premiumOnly: true },
];

const formatBrowserLocation = (label: string | null | undefined, fallback = 'Current location') => {
  if (!label) return fallback;
  return label;
};

const resolveBrowserLocation = async (): Promise<string | null> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          const formatted = formatNominatimAddress(place);

          resolve(formatBrowserLocation(formatted, 'Current location'));
        } catch {
          resolve(formatBrowserLocation(null, 'Current location'));
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
};

interface EventBuilderProps {
  initialEvent?: EventDraft | null;
  onNavigate: (page: string) => void;
}

export function EventBuilder({ initialEvent, onNavigate }: EventBuilderProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [date, setDate] = useState(initialEvent?.date ?? '');
  const [time, setTime] = useState(initialEvent?.time ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [notes, setNotes] = useState(initialEvent?.notes ?? '');
  const [category, setCategory] = useState<EventCategory>(initialEvent?.category ?? 'Meeting');
  const [attachedCards, setAttachedCards] = useState<Card[]>(initialEvent?.attachedCards ?? []);
  const [suggestedCards, setSuggestedCards] = useState<Card[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');
  const [searchSource, setSearchSource] = useState<CardSearchSource>('weather');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [eventId, setEventId] = useState<string | null>(initialEvent?.id ?? null);

  const isPremium = user?.tier === 'premium';

  const filteredSuggested = filterType === 'all'
    ? suggestedCards
    : suggestedCards.filter((c) => c.type === filterType);

  const availableSearchSources = SEARCH_SOURCES.filter(
    ({ premiumOnly }) => !premiumOnly || isPremium
  );

  useEffect(() => {
    // If the user downgrades or logs in without premium, keep the selected
    // search source valid by falling back to an allowed option.
    if (!availableSearchSources.some(({ type }) => type === searchSource)) {
      setSearchSource(availableSearchSources[0]?.type ?? 'weather');
    }
  }, [availableSearchSources, searchSource]);

  const handleSave = async () => {
    if (!user) return;
    const draft = buildEvent();
    try {
      if (eventId) {
        // Existing event ids mean this is an edit, so the backend should
        // replace the stored draft instead of creating a duplicate record.
        await fetch(`${API}/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...draft }),
        });
      } else {
        // New events are created first so the server can assign an id that the
        // client can reuse for later edits.
        const res = await fetch(`${API}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...draft }),
        });
        const data = await res.json();
        if (data.id) setEventId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      window.alert('Failed to save event. Check your connection and try again.');
    }
  };


  const handleFetch = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setFetchError(null);
    try {
      let effectiveLocation = location.trim();
      if (!effectiveLocation) {
        // If the user leaves location blank, try to use browser geolocation so
        // the enrichment flow still has enough context to produce useful cards.
        const browserLocation = await resolveBrowserLocation();
        if (browserLocation) {
          effectiveLocation = browserLocation;
          setLocation(browserLocation);
        }
      }

      const cards = await fetchCardsForEvent({ date, time, location: effectiveLocation }, user);
      setSuggestedCards(cards);
      if (cards.length === 0) setFetchError('No cards returned. Try adding a location or date.');
    } catch {
      setFetchError('Failed to fetch cards. Check your connection and try again.');
    } finally {
      setFetching(false);
    }
  }, [user, date, time, location]);

  const getEmptySearchSuggestions = useCallback(async () => {
    if (!user) return [];

    const results: Card[] = [];
    const baseLocation = location.trim() || await resolveBrowserLocation();

    // Empty search is treated as a "suggest something useful" mode rather than
    // a no-op, so the UI can offer cards even before the user types a query.
    if (baseLocation) {
      results.push(...await searchCardsBySource('weather', baseLocation, user));
      results.push(...await searchCardsBySource('location', baseLocation, user));
    }

    results.push(...await searchCardsBySource('holiday', '', user));

    if (isPremium) {
      results.push(...await searchCardsBySource('nba', '', user));
      results.push(...await searchCardsBySource('nfl', '', user));
      results.push(...await searchCardsBySource('mlb', '', user));
      results.push(...await searchCardsBySource('movie', '', user));
    }

    const seen = new Set<string>();
    // Deduplicate by the visible content so repeated API sources do not flood
    // the search results with near-identical cards.
    return results.filter((card) => {
      const key = `${card.type}:${card.title}:${card.subtitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [user, location, isPremium]);

  const handleSearch = useCallback(async () => {
    if (!user) return;
    setSearching(true);
    setSearchError(null);
    try {
      const trimmedQuery = searchQuery.trim();
      const results = trimmedQuery
        ? await searchCardsBySource(searchSource, searchQuery, user)
        : await getEmptySearchSuggestions();
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(trimmedQuery
          ? 'No cards matched that search. Try a different keyword or location.'
          : 'No default suggestions available yet. Try entering a location or search term.');
      }
    } catch {
      setSearchError('Search failed. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [user, searchSource, searchQuery, getEmptySearchSuggestions]);

  const handleAttach = (card: Card) => {
    if (attachedCards.find((c) => c.id === card.id)) return;
    setAttachedCards((prev) => [...prev, card]);
  };

  const handleDetach = (card: Card) => {
    setAttachedCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const buildEvent = (): EventDraft => ({
    id: eventId ?? '',
    title: title || 'Untitled Event',
    date,
    time,
    location,
    notes,
    category,
    attachedCards,
    createdAt: initialEvent?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleDownloadICS = () => {
    // Export uses the same normalized draft object that is saved to the API.
    downloadICS(buildEvent());
  };

  const handleCopy = async () => {
    // Copying the event text gives the user a quick shareable version without
    // needing to leave the app.
    const text = copyEventDetails(buildEvent());
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {title || 'New Event'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My awesome event"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter a Location"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any extra details..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleFetch}
                  disabled={fetching}
                  className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {fetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {fetching ? 'Fetching...' : 'Fetch Cards'}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700 font-semibold px-3.5 py-2.5 rounded-xl hover:border-gray-300 transition-colors"
                >
                  {saved ? <Check className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                  {saved ? 'Saved' : 'Save Draft'}
                </button>
              </div>

              {fetchError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {fetchError}
                </p>
              )}
            </div>

            {attachedCards.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-900">
                    Attached Cards ({attachedCards.length})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadICS}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      .ics
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                  {attachedCards.map((card) => (
                    <CardItem key={card.id} card={card} onDetach={handleDetach} attached />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Search Cards</h3>
                    <p className="text-xs text-gray-500">
                      Search manually for cards
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_auto] gap-2">
                  <select
                    value={searchSource}
                    onChange={(e) => setSearchSource(e.target.value as CardSearchSource)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition bg-white"
                  >
                    {availableSearchSources.map(({ type, label }) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder={
                      searchSource === 'weather'
                        ? 'Search a city or place'
                        : searchSource === 'location'
                          ? 'Search a venue, city, or address'
                          : searchSource === 'nba'
                            ? 'Search an NBA team'
                            : searchSource === 'nfl'
                              ? 'Search an NFL team'
                              : searchSource === 'mlb'
                                ? 'Search an MLB team'
                                : searchSource === 'movie'
                                  ? 'Search a movie, director, or actor'
                                  : 'Search a holiday or year'
                    }
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                  />

                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="flex items-center justify-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchError && (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {searchError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">
                  Suggested Cards
                  {suggestedCards.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({filteredSuggested.length} shown)
                    </span>
                  )}
                </h2>
                {!isPremium && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" />
                    Upgrade for leagues & movies
                  </span>
                )}
              </div>

              {suggestedCards.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {CARD_TYPES.map(({ type, label }) => {
                    const count = type === 'all'
                      ? suggestedCards.length
                      : suggestedCards.filter((c) => c.type === type).length;
                    if (count === 0 && type !== 'all') return null;
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${filterType === type
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {label} {count > 0 && <span className="opacity-70">({count})</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestedCards.length === 0 && !fetching && (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No cards yet</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Fill in a date and location, then click Fetch Cards to get weather, holiday, and venue info.
                  </p>
                </div>
              )}

              {fetching && (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Fetching insights...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Search Results
                    </h3>
                    <button
                      onClick={() => setSearchResults([])}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-150 overflow-y-auto pr-1">
                    {searchResults.map((card) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        onAttach={handleAttach}
                        attached={!!attachedCards.find((c) => c.id === card.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredSuggested.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-150 overflow-y-auto pr-1">
                  {filteredSuggested.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      onAttach={handleAttach}
                      attached={!!attachedCards.find((c) => c.id === card.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}