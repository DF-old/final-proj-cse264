import type { Card } from '../../event_types/card';
import type { ESPNEvent, SportLeague, TeamMatch } from '../apis/sports';

const LEAGUE_LABELS: Record<SportLeague, string> = {
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
};

function adaptSportEventToCard(event: ESPNEvent, league: SportLeague): Card {
  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  const venue = comp?.venue?.fullName ?? 'TBD';
  const status = event.status?.type?.description ?? event.status?.type?.name ?? 'Scheduled';
  const completed = event.status?.type?.completed ?? false;

  const homeScore = home?.score ?? '-';
  const awayScore = away?.score ?? '-';
  const homeTeam = home?.team?.displayName ?? 'Home';
  const awayTeam = away?.team?.displayName ?? 'Away';

  const title = `${awayTeam} @ ${homeTeam}`;
  const subtitle = completed
    ? `Final: ${awayScore} – ${homeScore}`
    : new Date(event.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // Convert ESPN's nested event payload into a single readable card for the planner UI.
  return {
    id: crypto.randomUUID(),
    type: league,
    source: 'ESPN' as const,
    title,
    subtitle,
    summary: `${LEAGUE_LABELS[league]} game — ${status}. Venue: ${venue}.`,
    icon: 'trophy',
    image: home?.team?.logo ?? null,
    priority: 'info' as const,
    tags: [league, 'scoreboard', status.toLowerCase()],
    fields: [
      { label: 'League', value: LEAGUE_LABELS[league] },
      { label: 'Home', value: homeTeam },
      { label: 'Away', value: awayTeam },
      { label: 'Score', value: completed ? `${awayScore} – ${homeScore}` : 'TBD' },
      { label: 'Status', value: status },
      { label: 'Venue', value: venue },
      { label: 'Date', value: new Date(event.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
    ],
    rawRef: { providerId: event.id, externalUrl: null },
  };
}

export function adaptSportsEventsToCards(events: ESPNEvent[], league: SportLeague): Card[] {
  return events.slice(0, 6).map((event) => adaptSportEventToCard(event, league));
}

export function adaptESPNEventsToCards(events: ESPNEvent[], league: SportLeague): Card[] {
  return adaptSportsEventsToCards(events, league);
}

export function adaptTeamMatchesToCards(matches: TeamMatch[]): Card[] {
  // Team search results reuse the same event card builder so the card layout stays consistent.
  return matches.map(({ event, league }) => adaptSportEventToCard(event, league));
}
