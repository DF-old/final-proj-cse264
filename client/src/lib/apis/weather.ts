export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
}

export interface OpenMeteoForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}


export interface NWSForecastPeriod {
  name: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  shortForecast: string;
  detailedForecast: string;
  isDaytime: boolean;
  startTime: string;
}

// provides a simple geocoding function that returns multiple results, which can be useful for letting users pick the right location when there are multiple matches
export async function geocodeLocations(query: string): Promise<GeocodingResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json&countryCode=US`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

// a simpler geocoding function for when we just want the best match, like for a weather search
export async function geocodeLocation(query: string): Promise<GeocodingResult | null> {
  const results = await geocodeLocations(query);
  return results[0] ?? null;
}

//  provides a simple way to get a 7-day forecast for a location with one request, but is less detailed 
export async function fetchOpenMeteoForecast(lat: number, lon: number): Promise<OpenMeteoForecast | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
    ].join(','),
    current: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m'].join(','),
    timezone: 'America/New_York',
    forecast_days: '7',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) return null;
  return res.json();
}

// Fetches a forecast from the National Weather Service API, which provides detailed forecasts
export async function fetchNWSForecast(lat: number, lon: number): Promise<NWSForecastPeriod[] | null> {
  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { 'User-Agent': 'EventPlannerApp/1.0' },
    });
    if (!pointsRes.ok) return null;
    const pointsData = await pointsRes.json();
    const forecastUrl = pointsData?.properties?.forecast;
    if (!forecastUrl) return null;
    const forecastRes = await fetch(forecastUrl, {
      headers: { 'User-Agent': 'EventPlannerApp/1.0' },
    });
    if (!forecastRes.ok) return null;
    const forecastData = await forecastRes.json();
    return forecastData?.properties?.periods ?? null;
  } catch {
    return null;
  }
}