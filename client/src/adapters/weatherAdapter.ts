import { Card } from "../../event_types/card";
import { OpenMeteoForecast, NWSForecastPeriod } from "../apis/weather";


function tempF(c: number): string {
  return `${Math.round((c * 9) / 5 + 32)}°F`;
}

export function adaptOpenMeteoToCards(data: OpenMeteoForecast, locationName: string): Card[] {
  const cards: Card[] = [];
  const { current, daily } = data;

  // Produce one current card plus a few forecast cards so the weather section
  // stays useful without overwhelming the event builder.
  const currentCard: Card = {
    id: crypto.randomUUID(),
    type: 'weather',
    source: 'Open-Meteo',
    title: `Current Weather — ${locationName}`,
    subtitle: `${tempF(current.temperature_2m)} now`,
    summary: `Currently ${tempF(current.temperature_2m)} with ${current.relative_humidity_2m}% humidity and winds at ${current.wind_speed_10m} km/h.`,
    icon: 'cloud',
    image: null,
    priority: 'info',
    tags: ['weather', 'current'],
    fields: [
      { label: 'Temperature', value: tempF(current.temperature_2m) },
      { label: 'Humidity', value: `${current.relative_humidity_2m}%` },
      { label: 'Wind Speed', value: `${current.wind_speed_10m} km/h` },
    ],
    rawRef: { providerId: null, externalUrl: null },
  };
  cards.push(currentCard);

  for (let i = 0; i < Math.min(3, daily.time.length); i++) {
    const precip = daily.precipitation_probability_max[i];
    const priority = precip >= 70 ? 'warning' : 'info';
    const card: Card = {
      id: crypto.randomUUID(),
      type: 'weather',
      source: 'Open-Meteo',
      title: `Forecast — ${daily.time[i]}`,
      subtitle: `${tempF(daily.temperature_2m_min[i])} – ${tempF(daily.temperature_2m_max[i])}`,
      summary: `High of ${tempF(daily.temperature_2m_max[i])}, low of ${tempF(daily.temperature_2m_min[i])}. Rain chance: ${precip}%.`,
      icon: precip >= 70 ? 'cloud-rain' : 'sun',
      image: null,
      priority,
      tags: ['weather', 'forecast', precip >= 70 ? 'rain-likely' : 'clear'],
      fields: [
        { label: 'High', value: tempF(daily.temperature_2m_max[i]) },
        { label: 'Low', value: tempF(daily.temperature_2m_min[i]) },
        { label: 'Rain Chance', value: `${precip}%` },
        { label: 'Precipitation', value: `${daily.precipitation_sum[i]} mm` },
        { label: 'Max Wind', value: `${daily.wind_speed_10m_max[i]} km/h` },
      ],
      rawRef: { providerId: null, externalUrl: null },
    };
    cards.push(card);
  }

  return cards;
}

export function adaptNWSToCards(periods: NWSForecastPeriod[]): Card[] {
  // The official forecast is trimmed to a few periods to keep the result list scannable.
  return periods.slice(0, 3).map((period) => {
    const hasAlert = /storm|thunder|snow|ice|freeze|warning/i.test(period.shortForecast);
    return {
      id: crypto.randomUUID(),
      type: 'weather' as const,
      source: 'NWS' as const,
      title: `NWS — ${period.name}`,
      subtitle: `${period.temperature}°${period.temperatureUnit}`,
      summary: period.shortForecast,
      icon: hasAlert ? 'alert-triangle' : 'cloud',
      image: null,
      priority: hasAlert ? 'warning' : ('info' as const),
      tags: ['weather', 'nws', hasAlert ? 'alert' : 'forecast'],
      fields: [
        { label: 'Temperature', value: `${period.temperature}°${period.temperatureUnit}` },
        { label: 'Wind', value: period.windSpeed },
        { label: 'Conditions', value: period.shortForecast },
        { label: 'Details', value: period.detailedForecast.slice(0, 120) + '...' },
      ],
      rawRef: { providerId: null, externalUrl: null },
    };
  });
}
