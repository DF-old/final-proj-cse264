export type SportLeague = 'nba' | 'nfl' | 'mlb';

export interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  status: {
    type: {
      name: string;
      description: string;
      completed: boolean;
    };
  };
  competitions: Array<{
    competitors: Array<{
      team: { displayName: string; abbreviation: string; logo: string };
      score: string;
      homeAway: string;
    }>;
    venue?: { fullName: string };
  }>;
}

export interface TeamMatch {
  league: SportLeague;
  event: ESPNEvent;
}

const LEAGUE_MAP: Record<SportLeague, string> = {
  nba: 'basketball/nba',
  nfl: 'football/nfl',
  mlb: 'baseball/mlb',
};

const normalize = (value: string) =>
  // Normalize text before matching so team searches tolerate punctuation and spacing differences.
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Fetches the current scoreboard for a given league, which includes all recent and upcoming events
export async function fetchScoreboard(league: SportLeague): Promise<ESPNEvent[]> {
  const path = LEAGUE_MAP[league];
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.events ?? [];
}

// Fetches the current scoreboards for multiple leagues in parallel, useful for showing cross-sport results in the UI without making users wait for each league sequentially
export async function fetchScoreboards(leagues: SportLeague[] = ['nba', 'nfl', 'mlb']): Promise<Record<SportLeague, ESPNEvent[]>> {
  const entries = await Promise.all(
    leagues.map(async (league) => [league, await fetchScoreboard(league)] as const)
  );

  return entries.reduce((acc, [league, events]) => {
    acc[league] = events;
    return acc;
  }, {} as Record<SportLeague, ESPNEvent[]>);
}


// Checks if a given event matches a team query by looking for the query in the event name, status, and team names
export function eventMatchesTeam(event: ESPNEvent, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return false;

  // Search across the event name, status, and team names so the lookup feels forgiving.
  const haystacks = [
    event.name,
    event.status?.type?.description,
    event.status?.type?.name,
    ...event.competitions.flatMap((competition) =>
      competition.competitors.flatMap((competitor) => [
        competitor.team.displayName,
        competitor.team.abbreviation,
      ])
    ),
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)));

  return haystacks.some((value) => value.includes(needle));
}


// Finds all events across a league that match a team query, returning the matching events along with their league for context
export function findEventsForTeam(events: ESPNEvent[], query: string, league: SportLeague): TeamMatch[] {
  return events
    .filter((event) => eventMatchesTeam(event, query))
    .map((event) => ({ league, event }));
}

// Searches for events across multiple leagues that match a team query
export async function searchTeamsAcrossLeagues(query: string): Promise<TeamMatch[]> {
  const leagues: SportLeague[] = ['nba', 'nfl', 'mlb'];
  const scoreboards = await fetchScoreboards(leagues);

  // Search each league scoreboard in the same pass so the UI can show cross-sport results.
  return leagues.flatMap((league) => findEventsForTeam(scoreboards[league], query, league));
}