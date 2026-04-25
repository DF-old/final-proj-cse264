import type { Card } from '../../event_types/card';
import type { PublicHoliday } from '../apis/holidays';

export function adaptHolidaysToCards(holidays: PublicHoliday[]): Card[] {
  return holidays.map((h) => {
    const isConflict = h.types.includes('Public');
    // Highlight public holidays a bit more because they can affect scheduling.
    return {
      id: crypto.randomUUID(),
      type: 'holiday' as const,
      source: 'Nager.Date' as const,
      title: h.name,
      subtitle: new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      summary: `${h.name} — ${h.countryCode}`,
      icon: 'calendar',
      image: null,
      priority: isConflict ? 'warning' : ('info' as const),
      tags: ['holiday', ...h.types],
      fields: [
        { label: 'Date', value: h.date },
        { label: 'Country', value: h.countryCode },
        { label: 'Type', value: h.types.join(', ') },
      ],
      rawRef: { providerId: null, externalUrl: null },
    };
  });
}
