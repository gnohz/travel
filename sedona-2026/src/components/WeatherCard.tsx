import { useState } from 'react';
import { CloudSun, Sun, CloudRain, Wind, Sunrise, Sunset, RefreshCw, ChevronDown } from 'lucide-react';
import { localDate, localTime, weatherTime } from '../services/time';
import { weatherLabel, wind, type SavedWeather } from '../services/weather';
type Props = { saved: SavedWeather | null; stale: boolean; online: boolean; loading: boolean; refresh: () => void; date?: string; unit: 'mph' | 'km/h'; setUnit: (v: 'mph' | 'km/h') => void; compact?: boolean };
export default function WeatherCard({ saved, stale, online, loading, refresh, date, unit, setUnit, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const data = saved?.data;
  const targetDate = date ?? localDate();
  const dayIndex = data?.daily.time.indexOf(targetDate) ?? -1;
  const validDay = dayIndex >= 0;
  const current = data?.current;
  const code = date && validDay ? data!.daily.weather_code[dayIndex] : current?.weather_code;
  const WeatherIcon = code === 0 ? Sun : code !== undefined && code >= 51 ? CloudRain : CloudSun;
  const hourIndex = data?.hourly.time.findIndex(t => t.slice(0, 13) === current?.time.slice(0, 13)) ?? -1;
  const probability = date && validDay ? data!.daily.precipitation_probability_max[dayIndex] : hourIndex >= 0 ? data!.hourly.precipitation_probability[hourIndex] : null;
  const hours = data?.hourly.time.map((time, i) => ({ time, i })).filter(h => h.time.startsWith(targetDate)) ?? [];
  const shortlist = hours.filter(h => [9, 12, 15].includes(Number(h.time.slice(11, 13))));
  const temp = (value: number | undefined) => Number.isFinite(value) ? `${Math.round(value!)}°` : '—';
  return <section className={`weather-card ${compact ? 'compact' : ''}`} aria-label="Sedona 天气">
    <div className="section-top"><span className="eyebrow">SEDONA WEATHER</span><button className="icon-button" aria-label="刷新天气" disabled={loading || !online} onClick={refresh}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div>
    {data && (!date || validDay) ? <>
      <div className="weather-main"><div><div className="temperature">{date ? <>{temp(data.daily.temperature_2m_max[dayIndex])}<small> / {temp(data.daily.temperature_2m_min[dayIndex])}</small></> : temp(current?.temperature_2m)}</div><p>{code !== undefined ? weatherLabel(code) : '—'}{!date && <> · 体感 {temp(current?.apparent_temperature)}C</>}</p></div><WeatherIcon size={51} strokeWidth={1.2} className="weather-symbol" /></div>
      <div className="weather-metrics">
        <div><span><Wind size={14} />{date ? '天气日期' : '风速'}</span><strong>{date ? targetDate.slice(5).replace('-', '/') : wind(current?.wind_speed_10m, unit)}{!date && <small> {unit}</small>}</strong></div>
        <div><span>{date ? '最高 / 最低' : '阵风'}</span><strong>{date ? `${temp(data.daily.temperature_2m_max[dayIndex])} / ${temp(data.daily.temperature_2m_min[dayIndex])}` : wind(current?.wind_gusts_10m, unit)}{!date && <small> {unit}</small>}</strong></div>
        <div><span>降雨概率</span><strong>{probability == null ? '—' : `${probability}%`}</strong></div>
      </div>
      <div className="sun-times"><span><Sunrise size={16} /> {validDay ? weatherTime(data.daily.sunrise[dayIndex]) : '—'}</span><span><Sunset size={16} /> {validDay ? weatherTime(data.daily.sunset[dayIndex]) : '—'}</span><button className="text-button unit" onClick={() => setUnit(unit === 'mph' ? 'km/h' : 'mph')}>{unit}</button></div>
    </> : <div className="weather-empty"><CloudSun size={36} strokeWidth={1.2} /><p>{loading ? '正在获取 Sedona 天气…' : date && data ? '此日期暂无可用预报' : online ? '天气暂时无法获取' : '离线 · 尚无天气缓存'}</p><small>{date && data ? '超出预报范围时不显示估算天气。' : '行程和导航仍可正常查看。'}</small></div>}
    <div className="weather-meta"><span>{saved ? `${!online ? '离线天气' : stale ? '缓存天气' : '天气更新'} · ${localDate(new Date(saved.updatedAt)).slice(5).replace('-', '/')} ${localTime(new Date(saved.updatedAt))}` : '真实数据由 Open-Meteo 提供'}</span>{saved && <span>Arizona 时间</span>}</div>
    {hours.length > 0 && <div className="hourly-wrap"><div className="hourly-strip">{shortlist.map(({ time, i }) => <div key={time}><span>{weatherTime(time)}</span><strong>{temp(data!.hourly.temperature_2m[i])}</strong><small>{data!.hourly.precipitation_probability[i] == null ? '降雨 —' : `降雨 ${data!.hourly.precipitation_probability[i]}%`}</small></div>)}</div><button className="text-button hourly-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>完整逐小时天气 <ChevronDown size={15} className={expanded ? 'rotate' : ''} /></button>{expanded && <div className="hourly-table" role="region" aria-label="逐小时天气表" tabIndex={0}><table><thead><tr><th>时间</th><th>温度</th><th>降雨</th><th>风 / 阵风 {unit}</th></tr></thead><tbody>{hours.map(({ time, i }) => <tr key={time}><td>{weatherTime(time)}</td><td>{temp(data!.hourly.temperature_2m[i])}C</td><td>{data!.hourly.precipitation_probability[i] == null ? '—' : `${data!.hourly.precipitation_probability[i]}%`}</td><td>{wind(data!.hourly.wind_speed_10m[i], unit)} / {wind(data!.hourly.wind_gusts_10m[i], unit)}</td></tr>)}</tbody></table></div>}</div>}
    <a className="weather-credit" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo · °C</a>
  </section>;
}
