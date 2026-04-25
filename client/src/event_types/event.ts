import { Card } from "./card";
export type EventCategory =
  | 'Meeting'
  | 'Party'
  | 'Sports'
  | 'Movie Night'
  | 'Outdoor'
  | 'Travel'
  | 'Birthday'
  | 'Other';

// The event Card will have the info needed as
// a calender event
export interface EventDraft {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  category: EventCategory;
  attachedCards: Card[];
  createdAt: string;
  updatedAt: string;
}
