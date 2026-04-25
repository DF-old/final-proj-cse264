export type CardType = 'weather' | 'nba' | 'nfl' | 'mlb' | 'movie' | 'holiday' | 'location' | 'export';
export type CardPriority = 'info' | 'warning' | 'suggestion' | 'critical';
export type CardSource =
  | 'Open-Meteo'
  | 'NWS'
  | 'ESPN'
  | 'TheSportsDB'
  | 'Nager.Date'
  | 'Nominatim'
  | 'IMDb'
  | 'JustWatch'
  | 'internal';

export interface CardField {
  label: string;
  value: string;
}

// Create an event card
// An Adapter pattern will be needed to convert
// The api format to the card format
export interface Card {
  id: string;
  type: CardType;
  source: CardSource;
  title: string;
  subtitle: string;
  summary: string;
  icon: string | null;
  image: string | null;
  priority: CardPriority;
  tags: string[];
  fields: CardField[];
  rawRef: {
    providerId: string | null;
    externalUrl: string | null;
  };
}
