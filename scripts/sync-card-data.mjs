import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/slimtreble/Riftbound-card-data/main/cards.json';
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/cards.json');
const imageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/images');

function thumbnailDetails(card) {
  const source = new URL(String(card.imageUrl ?? ''));
  source.hostname = 'cdn.sanity.io';
  source.pathname = source.pathname.replace(/^\/sanity/, '');
  source.search = 'w=320&auto=format&q=68';
  const hash = source.pathname.match(/\/([a-f0-9]{40})-/i)?.[1]?.slice(0, 12) ?? 'image';
  const safeId = String(card.id ?? '').toLocaleLowerCase().replace(/[^a-z0-9-]/g, '_');
  const filename = `${safeId}-${hash}.webp`;
  return { filename, url: source.toString() };
}

const response = await fetch(SOURCE_URL, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Card data download failed with HTTP ${response.status}`);

const sourceCards = await response.json();
if (!Array.isArray(sourceCards) || sourceCards.length < 100) {
  throw new Error('The downloaded card catalog did not have the expected shape.');
}

const cards = sourceCards.map((card) => {
  const thumbnail = thumbnailDetails(card);
  return {
    id: String(card.id ?? ''),
    code: String(card.code ?? ''),
    publicCode: String(card.publicCode ?? ''),
    set: String(card.set ?? ''),
    setName: String(card.setName ?? ''),
    collectorNumber: Number(card.collectorNumber ?? 0),
    name: String(card.name ?? ''),
    type: String(card.type ?? ''),
    rarity: String(card.rarity ?? ''),
    orientation: card.orientation === 'landscape' ? 'landscape' : 'portrait',
    isAltArt: card.isAltArt === true,
    isSigned: card.isSigned === true,
    isVariant: card.isVariant === true,
    imageUrl: String(card.imageUrl ?? ''),
    imagePath: `images/${thumbnail.filename}`,
    thumbnailUrl: thumbnail.url,
  };
}).filter((card) => card.id && card.name && card.imageUrl);

if (cards.length < 100) throw new Error('Too few valid cards remained after normalization.');

await mkdir(imageDirectory, { recursive: true });
let downloaded = 0;
let cursor = 0;
const workers = Array.from({ length: 12 }, async () => {
  while (cursor < cards.length) {
    const index = cursor++;
    const card = cards[index];
    const imageFile = resolve(imageDirectory, card.imagePath.slice('images/'.length));
    try {
      await access(imageFile);
    } catch {
      const imageResponse = await fetch(card.thumbnailUrl, { headers: { accept: 'image/webp' } });
      if (!imageResponse.ok) throw new Error(`Thumbnail download failed for ${card.id}: HTTP ${imageResponse.status}`);
      await writeFile(imageFile, Buffer.from(await imageResponse.arrayBuffer()));
      downloaded += 1;
      if (downloaded % 100 === 0) console.log(`Downloaded ${downloaded} thumbnails…`);
    }
  }
});
await Promise.all(workers);

const catalogCards = cards.map(({ thumbnailUrl: _thumbnailUrl, ...card }) => card);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  source: SOURCE_URL,
  generatedAt: new Date().toISOString(),
  cards: catalogCards,
})}\n`, 'utf8');

console.log(`Wrote ${catalogCards.length} cards and ${downloaded} new thumbnails to ${outputPath}`);
