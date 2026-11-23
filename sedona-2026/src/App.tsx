import { useEffect, useMemo, useState } from 'react';
import { Home, CalendarDays, MapPin, Menu, Mountain, Navigation, ChevronRight, ChevronLeft, Check, Download, WifiOff, CircleCheck, RefreshCw, Plane, CarFront, BedDouble, ShoppingBag, ExternalLink, Clock, ListChecks, Compass, X, Search, Info } from 'lucide-react';
import initialData from './data/travel.json';
import type { Activity, Category, Day, Place, TravelData } from './data/types';
import { currentTripDay, daysUntil, formatDate, localDate, localTime, nextActivity } from './services/time';
import { cachedWeather, fetchWeather } from './services/weather';
import { readLocal, writeLocal } from './services/storage';
import { applyUpdate, checkForUpdate, startOffline, subscribeOffline, type OfflineState } from './services/offline';
import { destination, mapLinks } from './services/maps';
import WeatherCard from './components/WeatherCard';
import { categoryNames, CopyAddress, Maps, Photo, PlaceCard, PlaceDetail } from './components/Place';

type Choices = Record<string, 'A' | 'B'>;
const navItems = [ { id: 'home', label: '首页', icon: Home, href: '#/' }, { id: 'day', label: '行程', icon: CalendarDays, href: '#/day' }, { id: 'places', label: '地点', icon: MapPin, href: '#/places' }, { id: 'more', label: '更多', icon: Menu, href: '#/more' } ];
const statusLabels = { confirmed: '用户已确认', planned: '计划安排', preferred: '首选', alternative: '备选', needs_verification: '待核实' };

function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const fn = () => { setRoute(location.hash.slice(1) || '/'); window.scrollTo({ top: 0, behavior: 'instant' }); }; window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn); }, []);
  return route;
}
function activeActivities(day: Day, choices: Choices) {
  return day.activities.filter(a => (!a.optionGroup || a.option === (choices[a.optionGroup] ?? 'A')) && (!a.condition || a.condition.option === (choices[a.condition.group] ?? 'A')));
}
function DayPicker({ days, selected }: { days: Day[]; selected?: string }) {
  return <nav className="day-picker" aria-label="旅行日期">{days.map((d, i) => <a key={d.date} href={`#/day/${d.date}`} className={d.date === selected ? 'selected' : ''} aria-current={d.date === selected ? 'date' : undefined}><span>DAY {i + 1}</span><strong>{d.date.slice(5).replace('-', '/')}</strong><small>{d.weekday.replace('星期', '周')}</small></a>)}</nav>;
}
function NextStop({ day, activities, data, now, manual, setManual }: { day: Day; activities: Activity[]; data: TravelData; now: Date; manual: string; setManual: (id: string) => void }) {
  const automatic = nextActivity(day, activities, now);
  const active = activities.find(a => a.id === manual) ?? automatic;
  const place = data.places.find(p => p.id === active?.placeId);
  const target = place ? destination(place, data.places) : undefined;
  const links = target ? mapLinks(target) : null;
  const ended = localDate(now) > data.days.at(-1)!.date;
  if (ended) return null;
  return <section className="next-stop"><div className="section-top"><span className="eyebrow"><Compass size={15} /> 下一站</span>{active && <span className="next-time">{active.time} {active.timeZone === 'America/Los_Angeles' ? 'CA' : 'AZ'}</span>}</div><h2>{active?.title ?? '今天的计划已结束'}</h2><p>{target?.name ?? (active ? active.description : '好好休息，明天继续出发。')}</p>{links && <a href={links.apple} target="_blank" rel="noreferrer" className="button button-primary"><Navigation size={17} /> 开始导航</a>}<div className="manual-select"><label htmlFor="current-activity">{manual ? '手动选择当前活动' : '按计划时间推断 · 非 GPS 定位'}</label><select id="current-activity" value={manual} onChange={e => setManual(e.target.value)}><option value="">自动选择下一站</option>{activities.map(a => <option key={a.id} value={a.id}>{a.time} {a.title}</option>)}</select></div></section>;
}
function Timeline({ day, activities, places, preview = false }: { day: Day; activities: Activity[]; places: Place[]; preview?: boolean }) {
  return <ol className={`timeline ${preview ? 'timeline-preview' : ''}`}>{activities.map((a, i) => {
    const place = places.find(p => p.id === a.placeId);
    return <li key={a.id}><div className="timeline-time"><time>{a.time}</time><span>{a.timeZone === 'America/Los_Angeles' ? 'California' : 'Arizona'}</span></div><div className="timeline-marker"><i /></div><div className="timeline-content">{preview ? <><h3>{a.title}</h3><p>{place?.name ?? a.description}</p></> : <><div className="activity-heading"><h3>{a.title}</h3><span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span></div><p>{a.description}</p>{a.duration && <span className="duration"><Clock size={14} />{a.duration}</span>}{place && <a className="place-inline" href={`#/place/${place.id}`}><MapPin size={15} /><span>{place.name}</span><ChevronRight size={15} /></a>}{(a.notes.length > 0 || place) && <details><summary>详情与导航</summary><div className="activity-details">{a.notes.length > 0 && <ul>{a.notes.map(n => <li key={n}>{n}</li>)}</ul>}{place && <><p className="small">车辆目的地：{destination(place, places).name}</p><Maps place={place} places={places} compact /><a className="text-link" href={`#/place/${place.id}`}>地点、停车与注意事项 <ChevronRight size={14} /></a></>}</div></details>}</>}</div></li>;
  })}</ol>;
}
function PlanChoices({ day, choices, setChoice }: { day: Day; choices: Choices; setChoice: (group: string, value: 'A' | 'B') => void }) {
  const groups = [...new Set(day.activities.flatMap(a => a.optionGroup ? [a.optionGroup] : []))];
  if (!groups.length) return null;
  return <div className="plan-choices">{groups.map(group => <fieldset key={group}><legend>{group.startsWith('hike') ? '今天的徒步 · 二选一' : '午餐选择 · 二选一'}</legend><div className="plan-buttons">{day.activities.filter(a => a.optionGroup === group).map(a => <button className={(choices[group] ?? 'A') === a.option ? 'active' : ''} key={a.id} onClick={() => setChoice(group, a.option!)} aria-pressed={(choices[group] ?? 'A') === a.option}><span>{a.option === 'A' ? '首选' : '备选'}</span><strong>{a.title.replace(/^(Plan [AB] · |首选 · |备选 · )/, '').replace(/ 午餐备选| 午餐$/, '')}</strong></button>)}</div></fieldset>)}<p className="small muted">选择会保存在这台设备，只显示所选方案。</p></div>;
}
function Places({ data }: { data: TravelData }) {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const places = data.places.filter(p => (category === 'all' || p.category === category) && `${p.name} ${p.chineseName} ${p.address} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="page-heading"><span className="eyebrow">PLACES & LITTLE DISCOVERIES</span><h1>一路上的好地方</h1><p>步道、餐厅、停车与小屋，都在这里。</p></div><label className="search"><Search size={19} /><input aria-label="搜索地点或地址" placeholder="搜索地点、餐厅或地址" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X size={16} /></button>}</label><div className="filter-tabs" aria-label="地点分类">{[['all', '全部'], ...Object.entries(categoryNames)].map(([key, label]) => <button key={key} onClick={() => setCategory(key as Category | 'all')} className={category === key ? 'active' : ''} aria-pressed={category === key}>{label}</button>)}</div><p className="results-count">{places.length} 个地点</p><div className="places-grid">{places.map(p => <PlaceCard key={p.id} place={p} />)}</div>{places.length === 0 && <div className="empty-state"><Search size={30} /><h2>没有找到这个地点</h2><p>试试英文名称，或切换到“全部”。</p></div>}</>;
}
function More({ data, offline, online }: { data: TravelData; offline: OfflineState; online: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readLocal('checklist', {}));
  const [credits, setCredits] = useState<{ file: string; title: string; author: string; license: string; source: string }[]>([]);
  useEffect(() => { void fetch(`${import.meta.env.BASE_URL}images/credits.json`).then(r => r.ok ? r.json() : []).then(setCredits).catch(() => {}); }, []);
  return <><div className="page-heading"><span className="eyebrow">THE LITTLE THINGS, TAKEN CARE OF</span><h1>出发前，都准备好</h1><p>离线指南、预订信息和随手可查的小事。</p></div><div className="more-grid"><section className="offline-panel" id="offline"><div className="feature-icon">{online ? <Download size={24} /> : <WifiOff size={24} />}</div><h2>把旅程装进口袋</h2><p>先联网打开一次，保存完成后，五天行程、地点和 PDF 都能离线查看。</p><p className={`offline-status ${offline.ready ? 'ready' : ''}`} role="status">{offline.ready ? <CircleCheck size={17} /> : <Info size={17} />}{!online ? '当前离线，正在使用已保存的行程' : offline.message}</p><div className="offline-actions"><button className="button button-primary" disabled={offline.busy} onClick={() => offline.waiting ? applyUpdate() : void checkForUpdate()}><RefreshCw size={16} className={offline.busy ? 'spin' : ''} />{offline.waiting ? '发现新版本，立即更新' : '检查更新'}</button><a className="button button-secondary" href={`${import.meta.env.BASE_URL}sedona-2026-guide.pdf`} download="Sedona-2026-中文旅行指南.pdf"><Download size={16} />下载离线 PDF</a></div><details className="install-help"><summary>添加到 iPhone 主屏幕</summary><ol><li>用 Safari 打开网站，点底部的“分享”。</li><li>选择“添加到主屏幕”，点“添加”。</li><li>打开主屏幕图标，等“已准备好离线使用”显示后再出发。</li><li>开启飞行模式，重新打开并检查五天行程。地图导航仍需要地图应用的网络或离线地图。</li></ol></details><p className="small muted">iOS 可能清理长期不用的网站存储；出发前重新联网打开并检查。天气离线时只显示带更新时间的缓存。</p></section>
    <section className="info-panel"><span className="eyebrow"><Plane size={16} /> FLIGHTS</span><h2>往返航班</h2>{data.flights.map(f => <div className="flight" key={f.number}><div className="section-top"><span>{f.label}</span><strong>{f.number}</strong></div><div className="flight-route"><div><strong>{f.from}</strong><span>{f.departure}</span></div><Plane size={22} strokeWidth={1.2} /><div><strong>{f.to}</strong><span>{f.arrival}</span></div></div><p className="small muted">{f.notes}</p></div>)}<div className="time-note">本次旅行 Arizona 比 California 快 1 小时。网站的 Sedona 日期和活动时间均按 America/Phoenix 显示。</div></section>
    <section className="info-panel"><span className="eyebrow"><BedDouble size={16} /> STAYS</span><h2>三晚红岩，一晚城市</h2>{data.stays.map(s => { const p = data.places.find(p => p.id === s.placeId)!; return <div className="stay" key={s.placeId}><h3>{p.name}</h3><CopyAddress place={p} /><div className="stay-dates"><span>入住<strong>{s.checkIn}</strong></span><span>退房<strong>{s.checkOut}</strong></span><span>住宿<strong>{s.nights} 晚</strong></span></div><Maps place={p} places={data.places} compact />{s.url && <a className="text-link" target="_blank" rel="noreferrer" href={s.url}>查看 Airbnb 房源 <ExternalLink size={14} /></a>}</div>; })}</section>
    <section className="info-panel"><span className="eyebrow"><CarFront size={16} /> ON THE ROAD</span><h2>{data.rental.company} · 租车</h2><h3>{data.rental.vehicle}</h3><ul className="note-list">{data.rental.details.map(d => <li key={d}>{d}</li>)}</ul><Maps place={data.places.find(p => p.id === 'rental')!} places={data.places} compact /><div className="shopping-list"><span className="eyebrow"><ShoppingBag size={16} /> 采购清单</span><p>到 Sedona 后采购，避免耽误日落。</p><ul className="note-list">{data.shopping.map(item => <li key={item}>{item}</li>)}</ul><div className="text-links"><a href="#/place/whole-foods">Whole Foods</a><a href="#/place/safeway">Safeway 备选</a></div></div></section>
    <section className="info-panel"><span className="eyebrow"><ListChecks size={16} /> BEFORE WE GO</span><h2>出发清单</h2><div className="checklist">{data.checklist.map(item => <label key={item}><input type="checkbox" checked={!!checked[item]} onChange={() => { const next = { ...checked, [item]: !checked[item] }; setChecked(next); writeLocal('checklist', next); }} /><span>{item}</span></label>)}</div><p className="small muted">勾选只保存在这台设备。</p></section>
    <section className="info-panel"><span className="eyebrow">INFORMATION & SOURCES</span><h2>可靠信息，安心出发</h2><ul className="note-list">{data.verification.map(v => <li key={v}>{v}</li>)}</ul><div className="source-list">{data.sources.map(s => <a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.title}<ExternalLink size={14} /></a>)}</div><details><summary>图片来源与许可</summary><ul className="credit-list">{credits.filter((c, i, all) => all.findIndex(x => x.source === c.source) === i).map(c => <li key={c.source}><a href={c.source} target="_blank" rel="noreferrer">{c.title} · {c.author}</a><span>{c.license}</span></li>)}</ul><p className="small muted">主要步道与景点均使用对应地点的实景照片。照片已压缩并保存在本地，支持离线查看。</p></details><p className="small muted">行程更新：{data.updatedAt}。不在公开网站保存门锁密码、预订确认号或个人联系方式。</p></section></div></>;
}

export default function App() {
  const [data, setData] = useState<TravelData>(initialData as TravelData);
  const route = useRoute();
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [weather, setWeather] = useState(cachedWeather);
  const [weatherStale, setWeatherStale] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [unit, setUnitState] = useState<'mph' | 'km/h'>(() => readLocal('wind-unit', 'mph'));
  const [choices, setChoices] = useState<Choices>(() => readLocal('choices', {}));
  const [manuals, setManuals] = useState<Record<string, string>>(() => readLocal('manuals', {}));
  const [offline, setOffline] = useState<OfflineState>({ ready: false, waiting: false, busy: false, message: '正在准备离线内容…' });
  const todayDay = currentTripDay(data.days, now);
  const [, page, id] = route.split('/');
  const section = page === 'place' ? 'places' : page || 'home';
  const day = data.days.find(d => d.date === id) ?? todayDay;
  const setChoice = (group: string, option: 'A' | 'B') => { const next = { ...choices, [group]: option }; setChoices(next); writeLocal('choices', next); };
  const setUnit = (v: 'mph' | 'km/h') => { setUnitState(v); writeLocal('wind-unit', v); };
  const refreshWeather = async () => {
    if (!navigator.onLine) { setWeatherStale(true); return; }
    setWeatherLoading(true);
    try { setWeather(await fetchWeather()); setWeatherStale(false); } catch { setWeatherStale(true); } finally { setWeatherLoading(false); }
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const connected = () => { setOnline(true); void refreshWeather(); };
    const disconnected = () => { setOnline(false); setWeatherStale(true); };
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    void refreshWeather(); void startOffline();
    const unsubscribe = subscribeOffline(setOffline);
    return () => { clearInterval(timer); window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); unsubscribe(); };
  }, []);
  useEffect(() => { void fetch(`${import.meta.env.BASE_URL}data/travel.json`, { signal: AbortSignal.timeout(8000) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then((next: TravelData) => { if (next.days?.length === 5 && Array.isArray(next.places)) setData(next); }).catch(() => {}); }, []);
  useEffect(() => { document.title = `${section === 'day' ? day.title : section === 'places' ? '地点' : section === 'more' ? '旅行准备' : '感恩节红岩之旅'}｜Sedona 2026`; }, [section, day.title]);
  const selectedDay = section === 'day' ? day : todayDay;
  const activities = useMemo(() => activeActivities(selectedDay, choices), [selectedDay, choices]);
  const setManual = (id: string) => { const next = { ...manuals, [selectedDay.date]: id }; setManuals(next); writeLocal('manuals', next); };
  const weatherProps = { saved: weather, stale: weatherStale || !!weather && Date.now() - Date.parse(weather.updatedAt) > 1800000, online, loading: weatherLoading, refresh: () => void refreshWeather(), unit, setUnit };
  const before = localDate(now) < data.days[0].date;
  const after = localDate(now) > data.days.at(-1)!.date;
  const activePlace = data.places.find(p => p.id === id);
  return <><a className="skip-link" href="#main-content">跳到主要内容</a><header className="site-header"><a href="#/" className="brand"><Mountain size={28} strokeWidth={1.35} /><div><strong>SEDONA <span>2026</span></strong><small>A FAMILY FIELD GUIDE</small></div></a><nav className="desktop-nav" aria-label="主导航">{navItems.map(n => <a key={n.id} href={n.href} className={section === n.id ? 'active' : ''} aria-current={section === n.id ? 'page' : undefined}>{n.label}</a>)}</nav><a className={`header-status ${!online ? 'is-offline' : ''}`} href="#/more">{!online ? <WifiOff size={15} /> : offline.ready ? <CircleCheck size={15} /> : <Download size={15} />}<span>{!online ? '离线模式' : offline.ready ? '离线已就绪' : '离线指南'}</span></a></header>
    {!online && <div className="offline-banner" role="status"><WifiOff size={15} /> 当前离线，正在使用已保存的行程</div>}{offline.waiting && <div className="update-banner" role="status"><span>发现新版本行程</span><button disabled={offline.busy} onClick={applyUpdate}>立即更新</button></div>}
    <main id="main-content" className={`main-shell page-${section}`} tabIndex={-1}>
    {section === 'home' && <><section className="hero"><Photo file="hero.jpg" alt="Sedona Cathedral Rock 红岩与夕照" className="hero-photo" /><div className="hero-shade" /><div className="hero-copy"><span className="hero-kicker">ARIZONA · THANKSGIVING 2026</span><h1>Sedona<span>把时间，留给红岩。</span></h1><p>感恩节红岩之旅</p><div className="hero-details"><span>2026.11.22 — 11.26</span><i /><span>两个家庭 · 五天四晚</span></div></div><span className="hero-caption">RED ROCKS. SLOW DAYS. GOOD COMPANY.</span></section><div className="welcome-line"><p>{before ? `还有 ${daysUntil(data.days[0].date, now)} 天，向红岩出发。` : after ? '把这段红岩时光，好好收藏。' : '早一点出发，慢一点看风景。'}<span>{data.party}</span></p><span className="local-clock">SEDONA {localTime(now)}<small>Arizona 当地时间</small></span></div><DayPicker days={data.days} selected={after ? undefined : todayDay.date} />
      <div className="home-grid"><div className="home-main"><div className="section-heading"><div><span className="eyebrow">{after ? 'FIVE DAYS TO REMEMBER' : before ? 'FIRST DAY, FIRST ADVENTURE' : 'A LITTLE PLAN FOR TODAY'}</span><h2>{after ? '五天红岩时光' : before ? '第一天，先追一场日落' : '今天，去哪里'}</h2></div>{!after && <a className="text-link" href={`#/day/${todayDay.date}`}>完整行程 <ChevronRight size={15} /></a>}</div>{after ? <div className="trip-overview">{data.days.map((d, i) => <a key={d.date} href={`#/day/${d.date}`}><span>DAY {i + 1} · {formatDate(d.date)}</span><h3>{d.title}</h3><p>{d.summary}</p><ChevronRight size={18} /></a>)}</div> : <><div className="today-heading"><span>{formatDate(todayDay.date)} · {todayDay.weekday}</span><h3>{todayDay.title}</h3></div><Timeline day={todayDay} activities={activeActivities(todayDay, choices).slice(0, 7)} places={data.places} preview /><a className="button button-secondary full-width" href={`#/day/${todayDay.date}`}>查看当天完整行程 <CalendarDays size={16} /></a></>}</div><aside className="home-sidebar"><WeatherCard {...weatherProps} /><NextStop day={todayDay} activities={activeActivities(todayDay, choices)} data={data} now={now} manual={manuals[todayDay.date] ?? ''} setManual={setManual} /></aside></div>
      <section className="trail-section"><div className="section-heading"><div><span className="eyebrow">OUT INTO THE RED ROCKS</span><h2>走进红岩的褶皱</h2></div><a className="text-link" href="#/places">所有地点 <ChevronRight size={15} /></a></div><div className="featured-trails">{['cathedral', 'bell', 'boynton'].map(id => <PlaceCard key={id} place={data.places.find(p => p.id === id)!} />)}</div></section><a className="offline-teaser" href="#/more"><Download size={25} /><div><h3>信号留在山外，行程随身带着。</h3><p>保存离线指南，下载完整中文 PDF。</p></div><ChevronRight size={20} /></a></>}
    {section === 'day' && <><div className="page-heading day-page-heading"><span className="eyebrow">DAY {data.days.indexOf(day) + 1} · {formatDate(day.date)} · {day.weekday}</span><h1>{day.title}</h1><p>{day.subtitle}</p><span className="timezone-label">活动时间为 Arizona；California 出发项另有标注。</span></div><DayPicker days={data.days} selected={day.date} /><div className="day-layout"><section><PlanChoices day={day} choices={choices} setChoice={setChoice} /><Timeline day={day} activities={activities} places={data.places} /><div className="day-pagination">{data.days.indexOf(day) > 0 ? <a href={`#/day/${data.days[data.days.indexOf(day) - 1].date}`}><ChevronLeft size={17} />前一天</a> : <span />}{data.days.indexOf(day) < 4 && <a href={`#/day/${data.days[data.days.indexOf(day) + 1].date}`}>后一天<ChevronRight size={17} /></a>}</div></section><aside className="day-sidebar"><NextStop day={day} activities={activities} data={data} now={now} manual={manuals[day.date] ?? ''} setManual={setManual} /><WeatherCard {...weatherProps} date={day.date} compact /><aside className="notice"><Info size={19} /><div><strong>按体力与天气调整</strong><p>时间是计划参考。带孩子徒步不强求登顶，首选与备选只需完成一套。</p><a href="https://www.fs.usda.gov/r03/coconino/alerts" target="_blank" rel="noreferrer">官方步道公告 <ExternalLink size={14} /></a></div></aside></aside></div></>}
    {section === 'places' && (page === 'place' ? activePlace ? <PlaceDetail key={activePlace.id} place={activePlace} data={data} /> : <div className="empty-state"><h1>没有找到这个地点</h1><a href="#/places">返回全部地点</a></div> : <Places data={data} />)}
    {section === 'more' && <More data={data} offline={offline} online={online} />}
    {!['home', 'day', 'places', 'more'].includes(section) && <div className="empty-state"><h1>这一页暂时找不到</h1><a href="#/">返回首页</a></div>}
    <footer className="site-footer"><Mountain size={23} strokeWidth={1.2} /><div><strong>SEDONA 2026</strong><p>两个家庭，一段红岩时光。</p></div><span>2026.11.22—11.26</span></footer></main><nav className="mobile-nav" aria-label="底部导航">{navItems.map(n => { const Icon = n.icon; return <a key={n.id} href={n.href} className={section === n.id ? 'active' : ''} aria-current={section === n.id ? 'page' : undefined}><Icon size={21} strokeWidth={section === n.id ? 2 : 1.6} /><span>{n.label}</span></a>; })}</nav></>;
}
