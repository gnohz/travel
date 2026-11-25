import type { Day, Place } from '../data/types';
import { Maps } from './Place';

export default function DinnerOptions({ day, places }: { day: Day; places: Place[] }) {
  const dinner = day.activities.find(activity => activity.placeOptions?.length);
  if (!dinner) return null;
  const options = dinner.placeOptions!.flatMap(id => {
    const place = places.find(item => item.id === id);
    return place ? [place] : [];
  });
  return <section className="dinner-options" aria-label="今晚三家晚餐餐厅">
    <span className="eyebrow">DINNER IN OLD TOWN</span>
    <h2>今晚晚餐 · 三家任选一家</h2>
    <p className="dinner-intro">{dinner.description}</p>
    <div className="dinner-grid">{options.map((place, index) => <article className="dinner-card" key={place.id}>
      <span className="dinner-tag">{index === 0 ? '推荐首选' : '晚餐候选'}</span>
      <h3><a href={`#/place/${place.id}`}>{place.name}</a></h3>
      <p>{place.description}</p>
      <p className="dinner-address">{place.address}</p>
      {place.openingHours && <p className="dinner-hours">{place.openingHours}</p>}
      <Maps place={place} places={places} compact />
      {place.officialUrl && <a className="text-link" href={place.officialUrl} target="_blank" rel="noreferrer">餐厅官网与菜单</a>}
    </article>)}</div>
  </section>;
}
