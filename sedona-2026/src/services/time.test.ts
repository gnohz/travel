import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/travel.json';
import type { TravelData } from '../data/types';
import { activityInstant, currentTripDay, daysUntil, localDate, localTime, nextActivity } from './time';
import { destination, mapLinks } from './maps';
import { wind, isWeather } from './weather';
const trip = data as TravelData;
test('Arizona day stays correct across California midnight', () => {
  const now = new Date('2026-11-23T07:30:00Z');
  assert.equal(localDate(now), '2026-11-23');
  assert.equal(localDate(now, 'America/Los_Angeles'), '2026-11-22');
  assert.equal(localTime(now), '00:30');
});
test('before, during, and after the trip have stable day selection and countdown', () => {
  assert.equal(daysUntil('2026-11-22', new Date('2026-11-21T20:00:00Z')), 1);
  assert.equal(currentTripDay(trip.days, new Date('2026-11-20T20:00:00Z')).date, '2026-11-22');
  assert.equal(currentTripDay(trip.days, new Date('2026-11-25T20:00:00Z')).date, '2026-11-25');
});
test('next stop converts California departures into correct Arizona instants', () => {
  const day = trip.days[0];
  const flight = day.activities.find(a => a.id === 'flight-out')!;
  assert.equal(new Date(activityInstant(day.date, flight)).toISOString(), '2026-11-22T16:20:00.000Z');
  assert.equal(nextActivity(day, day.activities, new Date('2026-11-22T16:00:00Z'))?.id, 'flight-out');
  assert.equal(nextActivity(day, day.activities, new Date('2026-11-23T05:00:00Z')), undefined);
});
test('all activities point to real places and all navigation resolves to vehicles destinations', () => {
  assert.equal(trip.days.length, 5);
  const ids = trip.places.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of trip.days) for (const a of d.activities) if (a.placeId) assert.ok(ids.includes(a.placeId), a.id);
  for (const p of trip.places) {
    const target = destination(p, trip.places);
    assert.ok(mapLinks(target), p.id);
    if (p.category === 'hiking') assert.equal(target.category, 'parking');
  }
  assert.equal(destination(trip.places.find(p => p.id === 'cathedral')!, trip.places).id, 'north-park');
  assert.equal(destination(trip.places.find(p => p.id === 'bridge')!, trip.places).id, 'west-park');
  assert.equal(destination(trip.places.find(p => p.id === 'soldier')!, trip.places).id, 'posse-park');
});
test('alternative choices have exactly one A and one B, with separate IDs', () => {
  for (const day of trip.days) {
    const groups = [...new Set(day.activities.flatMap(a => a.optionGroup ? [a.optionGroup] : []))];
    for (const group of groups) assert.deepEqual(day.activities.filter(a => a.optionGroup === group).map(a => a.option).sort(), ['A', 'B']);
    assert.equal(new Set(day.activities.map(a => a.id)).size, day.activities.length);
  }
});
test('weather handles missing fields and unit conversion without fake data', () => {
  assert.equal(isWeather(null), false); assert.equal(isWeather({ current: { temperature_2m: 12 } }), false);
  assert.equal(wind(16.09344, 'mph'), '10'); assert.equal(wind(16.09344, 'km/h'), '16'); assert.equal(wind(undefined, 'mph'), '—');
});
