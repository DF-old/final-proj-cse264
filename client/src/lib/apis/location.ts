export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    state?: string;
    country?: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
}

// Provides functions for geocoding and reverse geocoding using the Nominatim API
export async function searchLocation(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=5`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EventPlannerApp/1.0', 'Accept-Language': 'en' },
  });
  if (!res.ok) return [];
  return res.json();
}

// Reverse geocodes a latitude and longitude to get a human-readable address
export async function reverseGeocode(lat: number, lon: number): Promise<NominatimResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EventPlannerApp/1.0', 'Accept-Language': 'en' },
  });
  if (!res.ok) return null;
  return res.json();
}

// Formats a Nominatim result into a more user-friendly address string
export function formatNominatimAddress(place: NominatimResult | null): string | null {
  if (!place) return null;

  // Build a human-readable address from the best available pieces instead of
  // depending on one exact address format from the API.
  const street = [place.address?.house_number, place.address?.road]
    .filter(Boolean)
    .join(' ');

  const locality =
    place.address?.city ||
    place.address?.town ||
    place.address?.village ||
    place.address?.hamlet ||
    place.address?.suburb;

  const parts = [
    street,
    locality,
    place.address?.state,
    place.address?.postcode,
    place.address?.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : place.display_name;
}