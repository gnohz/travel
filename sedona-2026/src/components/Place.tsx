import { useState } from 'react';
import { Navigation, MapPin, Copy, Check, ExternalLink, Mountain, Clock, Footprints, TrendingUp, Bus, ChevronLeft } from 'lucide-react';
import type { Place, TravelData } from '../data/types';
import { destination, mapLinks } from '../services/maps';
export const categoryNames = { hiking: '徒步', restaurant: '餐厅', shopping: '购物', hotel: '住宿', airport: '机场', parking: '停车与接驳', attraction: '景点' };
export function Photo({ file, alt, className = '' }: { file?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return file && !failed ? <img className={className} src={`${import.meta.env.BASE_URL}images/${file}`} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div className={`${className} rock-placeholder`} role="img" aria-label={`${alt} · 风景插画`}><svg viewBox="0 0 600 360" aria-hidden="true"><path d="M0 0h600v360H0z" fill="#e9e5dc"/><circle cx="464" cy="87" r="37" fill="#d9b481"/><path d="M0 287l84-69 52 35 68-101 34 18 40-78 57 9 20 72 45 4 58 92 64-18 78 39v70H0z" fill="#c48869"/><path d="M0 317l105-43 60 26 95-57 85 40 100-31 58 45 97-10v73H0z" fill="#a96046"/><path d="M0 342l170-25 130 35 147-30 153 16v22H0z" fill="#7e6a53"/></svg><span>RED ROCK COUNTRY · 风景插画</span></div>;
}
export function Maps({ place, places, compact = false }: { place: Place; places: Place[]; compact?: boolean }) {
  const target = destination(place, places);
  const links = mapLinks(target);
  if (!links) return <p className="muted small">导航地点尚待核实</p>;
  return <div className={`maps ${compact ? 'maps-compact' : ''}`}><a className="button button-primary" href={links.apple} target="_blank" rel="noreferrer" aria-label={`Apple Maps 导航到 ${target.name}`}><Navigation size={16} /> Apple Maps</a><a className="button button-secondary" href={links.google} target="_blank" rel="noreferrer" aria-label={`Google Maps 导航到 ${target.name}`}><MapPin size={16} /> Google Maps</a></div>;
}
export function CopyAddress({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const address = place.address ?? (place.coordinates ? `${place.coordinates.latitude}, ${place.coordinates.longitude}` : '');
  if (!address) return null;
  return <div className="address"><MapPin size={17} /><button title="点击复制地址" onClick={async () => { try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setError(true); } }}><span>{address}</span>{copied ? <Check size={16} /> : <Copy size={15} />}</button><span className="sr-only" role="status">{copied ? '地址已复制' : error ? '无法自动复制，请长按地址复制' : ''}</span>{error && <small>请长按地址复制</small>}</div>;
}
export function PlaceCard({ place }: { place: Place }) {
  return <a className={`place-card ${place.category === 'hiking' ? 'trail-card' : ''}`} href={`#/place/${place.id}`}>{(place.image || place.category === 'hiking') && <Photo file={place.image} alt={place.name} className="place-thumbnail" />}<div className="place-card-copy"><span className="eyebrow">{categoryNames[place.category]}</span><h3>{place.chineseName ?? place.name}</h3><p className="english-name">{place.name}</p><p>{place.description}</p>{place.trail && <div className="trail-stats"><span><Footprints size={14} /> {place.trail.distance}</span><span><Clock size={14} /> {place.trail.duration}</span></div>}<span className="card-link">查看详情 <ExternalLink size={14} /></span></div></a>;
}
export function PlaceDetail({ place, data }: { place: Place; data: TravelData }) {
  const target = destination(place, data.places);
  return <article className="detail-page"><a className="back-link" href="#/places"><ChevronLeft size={18} /> 全部地点</a>{(place.image || place.category === 'hiking') && <figure><Photo file={place.image} alt={place.name} className="detail-photo" />{place.photoCredit && <figcaption className="photo-credit">照片：<a href={place.photoCredit.source} target="_blank" rel="noreferrer">{place.photoCredit.author}</a> · <a href={place.photoCredit.licenseUrl} target="_blank" rel="noreferrer">{place.photoCredit.license}</a> · 已缩放与压缩</figcaption>}</figure>}<div className="detail-heading"><span className="eyebrow">{categoryNames[place.category]}</span><h1>{place.chineseName ?? place.name}</h1><p className="english-title">{place.name}</p><p className="lead">{place.description}</p></div>
    {place.trail && <><div className="trail-facts">{[[Footprints, '距离', place.trail.distance], [Clock, '时间', place.trail.duration], [TrendingUp, '爬升', place.trail.elevation], [Mountain, '难度', place.trail.difficulty]].map(([Icon, label, value]) => { const I = Icon as typeof Mountain; return <div key={String(label)}><I size={21} /><span>{String(label)}</span><strong>{String(value)}</strong></div>; })}</div><section className="content-section"><h2>路线与节奏</h2><p>{place.trail.route}</p></section></>}
    <section className="navigation-panel"><span className="eyebrow">{place.category === 'hiking' ? '开车去这里 · 停车与接驳' : '地址与导航'}</span><h2>{target.name}</h2><CopyAddress place={target} />{place.trail?.shuttle && <p className="shuttle-note"><Bus size={19} />{place.trail.shuttle}</p>}{target.parkingNotes && <p>{target.parkingNotes}</p>}{target.id !== place.id && target.notes.map(n => <p className="small" key={n}>{n}</p>)}<Maps place={place} places={data.places} /></section>
    {place.openingHours && <section className="content-section"><h2>营业时间</h2><p>{place.openingHours}</p></section>}{place.notes.length > 0 && <section className="content-section"><h2>出发前知道</h2><ul className="note-list">{place.notes.map(n => <li key={n}>{n}</li>)}</ul></section>}
    {place.category === 'hiking' && <aside className="notice"><Mountain size={20} /><div><strong>出发前查看步道状态</strong><p>近期 Oak Creek Canyon 有洪水封闭公告。当天开放情况、岩面和天气以官方公告及现场为准。</p><a href="https://www.fs.usda.gov/r03/coconino/alerts" target="_blank" rel="noreferrer">查看 USFS 最新公告 <ExternalLink size={14} /></a></div></aside>}
    {place.officialUrl && <a className="source-link" href={place.officialUrl} target="_blank" rel="noreferrer">{place.officialLinkLabel ?? (place.verificationStatus === 'confirmed' ? '查看预订服务网站' : '查看官方信息')} <ExternalLink size={15} /></a>}<p className="muted small">{place.verificationStatus === 'confirmed' ? '用户提供的已确认信息；未向供应商二次核验。' : '资料核对于 2026/11/21；实际开放、班次与收费出发前再核实。'}</p>
  </article>;
}
