import { readLocal, writeLocal } from './storage';
import { fetchWithTimeout } from './request';
export type Weather = {
  latitude: number; longitude: number; timezone: string;
  current: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; wind_gusts_10m: number };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[] };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; sunrise: string[]; sunset: string[]; weather_code: number[] };
};
export type SavedWeather = { data: Weather; updatedAt: string };
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
  latitude: '34.8697', longitude: '-111.7610', timezone: 'America/Phoenix', forecast_days: '16',
  current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m',
  hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m',
  daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,weather_code',
  wind_speed_unit: 'kmh', temperature_unit: 'celsius',
});
export function isWeather(value: unknown): value is Weather {
  if (!value || typeof value !== 'object') return false;
  const v = value as Weather;
  return v.timezone === 'America/Phoenix' && Number.isFinite(v.current?.temperature_2m)
    && typeof v.current?.time === 'string' && Number.isFinite(v.current?.apparent_temperature)
    && Number.isFinite(v.current?.wind_speed_10m) && Number.isFinite(v.current?.wind_gusts_10m)
    && Number.isFinite(v.current?.weather_code)
    && Array.isArray(v.daily?.time) && Array.isArray(v.daily?.sunrise) && Array.isArray(v.daily?.sunset)
    && Array.isArray(v.daily?.temperature_2m_max) && Array.isArray(v.daily?.temperature_2m_min)
    && Array.isArray(v.daily?.precipitation_probability_max)
    && Array.isArray(v.daily?.weather_code)
    && Array.isArray(v.hourly?.time) && Array.isArray(v.hourly?.temperature_2m)
    && Array.isArray(v.hourly?.precipitation_probability) && Array.isArray(v.hourly?.weather_code)
    && Array.isArray(v.hourly?.wind_speed_10m) && Array.isArray(v.hourly?.wind_gusts_10m);
}
export function cachedWeather(): SavedWeather | null {
  const value = readLocal<SavedWeather | null>('weather', null);
  return value && isWeather(value.data) && Number.isFinite(Date.parse(value.updatedAt)) ? value : null;
}
export async function fetchWeather(): Promise<SavedWeather> {
  const response = await fetchWithTimeout(WEATHER_URL, { cache: 'no-store' }, 12000);
  if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isWeather(data)) throw new Error('Invalid weather response');
  const saved = { data, updatedAt: new Date().toISOString() };
  writeLocal('weather', saved);
  return saved;
}
export function weatherLabel(code: number) {
  if (code === 0) return '晴朗';
  if (code <= 3) return ['晴朗', '大部晴朗', '局部多云', '阴天'][code];
  if (code <= 48) return '有雾';
  if (code <= 57) return '毛毛雨';
  if (code <= 67) return '有雨';
  if (code <= 77) return '降雪';
  if (code <= 82) return '阵雨';
  if (code <= 86) return '阵雪';
  return '雷暴';
}
export function wind(value: number | undefined, unit: 'mph' | 'km/h') {
  return Number.isFinite(value) ? String(Math.round(unit === 'mph' ? value! / 1.609344 : value!)) : '—';
}
