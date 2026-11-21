// Read-only network audit. Run on demand: node scripts/check-links.mjs
// HTTP failures and anti-bot responses require a human/browser content check.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../src/data/travel.json', import.meta.url), 'utf8'));
const entries = new Map();
const add = (url, label) => { if (!url) return; if (!entries.has(url)) entries.set(url, []); entries.get(url).push(label); };
for (const place of data.places) {
  add(place.officialUrl, `place:${place.id}`);
  for (const source of place.sources ?? []) add(source.url, `place-source:${place.id}`);
}
for (const source of data.sources) add(source.url, `source:${source.title}`);
for (const stay of data.stays) add(stay.url, `stay:${stay.placeId}`);
const pending = [...entries];
const results = [];
async function worker() {
  for (let item; (item = pending.shift()); ) {
    const [url, references] = item;
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(18000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelLinkCheck/1.0)', Accept: 'text/html' } });
      const html = await response.text();
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim() ?? '';
      const suspicious = /page not found|access denied|just a moment|request rejected|404|not available/i.test(title);
      const crossDomain = new URL(url).hostname.replace(/^www\./, '') !== new URL(response.url).hostname.replace(/^www\./, '');
      const result = { url, references, status: response.status, finalUrl: response.url, title, needsReview: !response.ok || suspicious || crossDomain };
      results.push(result);
      console.log(`${response.status} ${result.needsReview ? 'REVIEW' : 'OK'} ${references.join(',')} | ${title.slice(0, 110)} | ${response.url}`);
    } catch (error) {
      results.push({ url, references, status: null, needsReview: true, error: error.message });
      console.log(`ERROR ${references.join(',')} | ${error.message} | ${url}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
results.sort((a, b) => a.url.localeCompare(b.url));
await mkdir(new URL('../../output/', import.meta.url), { recursive: true });
await writeFile(new URL('../../output/link-audit.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(`Audited ${results.length} unique URLs; ${results.filter(r => r.needsReview).length} require content/browser review.`);
