import { Card } from "../../event_types/card";
import { NominatimResult } from "../apis/location";


export function adaptNominatimToCards(results: NominatimResult[]): Card[] {
  return results.slice(0, 4).map((r) => {
    const address = [r.address?.road, r.address?.city, r.address?.state, r.address?.country]
      .filter(Boolean)
      .join(', ');
    // Convert geocoding results into a compact venue card the event builder can attach directly.
    return {
      id: crypto.randomUUID(),
      type: 'location' as const,
      source: 'Nominatim' as const,
      title: r.display_name.split(',')[0],
      subtitle: address || r.display_name.slice(0, 60),
      summary: r.display_name,
      icon: 'map-pin',
      image: null,
      priority: 'suggestion' as const,
      tags: ['location', r.type],
      fields: [
        { label: 'Place Name', value: r.display_name.split(',')[0] },
        { label: 'Address', value: address || r.display_name },
        { label: 'Coordinates', value: `${parseFloat(r.lat).toFixed(4)}, ${parseFloat(r.lon).toFixed(4)}` },
        { label: 'Type', value: r.type },
        { label: 'Importance', value: r.importance.toFixed(3) },
      ],
      rawRef: { providerId: r.place_id.toString(), externalUrl: null },
    };
  });
}
