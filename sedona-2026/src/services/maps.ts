import type { Place } from '../data/types';
export function destination(place: Place, places: Place[]) {
  return places.find(p => p.id === place.navigationId) ?? place;
}
export function mapLinks(place: Place) {
  const query = place.coordinates ? `${place.coordinates.latitude},${place.coordinates.longitude}` : place.address;
  if (!query) return null;
  return {
    apple: `https://maps.apple.com/?daddr=${encodeURIComponent(query)}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`,
  };
}
