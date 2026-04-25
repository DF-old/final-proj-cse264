export interface PublicHoliday {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
    global: boolean;
    types: string[];
}

// Fetches public holidays for a given year and country
export async function fetchPublicHolidays(year: number, countryCode = 'US'): Promise<PublicHoliday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`);
  if (!res.ok) return [];
  return res.json();
}

export function findNearbyHolidays(holidays: PublicHoliday[], date: string, windowDays = 14): PublicHoliday[] {
  const target = new Date(date).getTime();
  // Keep holidays that are close enough to matter for planning around an event.
  const window = windowDays * 24 * 60 * 60 * 1000;
  return holidays.filter((h) => {
    const diff = Math.abs(new Date(h.date).getTime() - target);
    return diff <= window;
  });
}