import type { EventDraft } from '../event_types/event';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// Convert a datestring to the format needed for ICS (YYYYMMDDTHHMMSS)
function toICSDate(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [rawTime, period] = time.split(' ');
  let [hours, minutes] = rawTime.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
}

function escapeICS(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}


// Generate an ICS file content from an event draft
export function generateICS(event: EventDraft): string {
  const dtstart = toICSDate(event.date, event.time);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Include attached card summaries in the calendar description so the export keeps the planning context.
  const cardSummary = event.attachedCards
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.summary}`)
    .join('\n');
  const description = [event.notes, cardSummary].filter(Boolean).join('\n\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPlanner//EventPlanner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtstart}`,
    `DTSTAMP:${now}`,
    `UID:${event.id}@eventplanner`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

// Trigger a download of the generated ICS file
export function downloadICS(event: EventDraft): void {
  const content = generateICS(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}


// Generate a text summary of the event details for copying to clipboard or sharing
export function copyEventDetails(event: EventDraft): string {
  
    // Keep the copy format plain text so it is easy to paste into messages, docs, or notes.
  const lines = [
    `Event: ${event.title}`,
    `Date: ${event.date}`,
    `Time: ${event.time}`,
    event.location && `Location: ${event.location}`,
    event.notes && `Notes: ${event.notes}`,
    '',
    'Attached Cards:',
    ...event.attachedCards.map(
      (c) => `  - [${c.type.toUpperCase()}] ${c.title}: ${c.summary}`
    ),
  ].filter((l): l is string => typeof l === 'string' && l !== '');
  return lines.join('\n');
}