import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../src/data/travel.json', import.meta.url), 'utf8'));
const credits = JSON.parse(await readFile(new URL('../public/images/credits.json', import.meta.url), 'utf8'));

test('all hiking places have real local photos with matching attribution', async () => {
  for (const place of data.places.filter(p => p.category === 'hiking')) assert.ok(place.image, place.id);
  for (const place of data.places.filter(p => p.image)) {
    assert.ok(!place.image.includes('/'), place.id);
    const bytes = await readFile(new URL(`../public/images/${place.image}`, import.meta.url));
    assert.equal(bytes.readUInt16BE(0), 0xffd8, place.id);
    assert.ok(bytes.length < 350000, `${place.id}: keep offline downloads small`);
    const credit = credits.find(c => c.file === place.image);
    assert.ok(credit, `${place.id}: source required`);
    assert.equal(place.photoCredit?.source, credit.source);
    assert.equal(place.photoCredit?.author, credit.author);
    assert.equal(new URL(place.photoCredit.licenseUrl).protocol, 'https:');
  }
});
