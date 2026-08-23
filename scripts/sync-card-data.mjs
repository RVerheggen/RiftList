import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/slimtreble/Riftbound-card-data/main/cards.json';
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/cards.json');
const imageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/images');
const maximumCardDropRatio = 0.05;
const maximumNewCards = 500;

async function readExistingCatalog() {
  try {
    const value = JSON.parse(await readFile(outputPath, 'utf8'));
    return Array.isArray(value.cards) ? value : null;
  } catch {
    return null;
  }
}

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

const existingCatalog = await readExistingCatalog();

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

if (new Set(cards.map((card) => card.id)).size !== cards.length) {
  throw new Error('The downloaded card catalog contained duplicate card IDs.');
}

if (existingCatalog) {
  const existingCards = existingCatalog.cards;
  const maximumCardDrop = Math.max(10, Math.floor(existingCards.length * maximumCardDropRatio));
  const cardDrop = existingCards.length - cards.length;
  if (cardDrop > maximumCardDrop) {
    throw new Error(`Catalog update rejected: card count dropped by ${cardDrop}, above the ${maximumCardDrop}-card safety limit.`);
  }

  const existingIds = new Set(existingCards.map((card) => card.id));
  const newCardCount = cards.filter((card) => !existingIds.has(card.id)).length;
  if (newCardCount > maximumNewCards) {
    throw new Error(`Catalog update rejected: ${newCardCount} new card IDs exceeded the ${maximumNewCards}-card safety limit.`);
  }
}

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
const catalogChanged = !existingCatalog
  || existingCatalog.source !== SOURCE_URL
  || JSON.stringify(existingCatalog.cards) !== JSON.stringify(catalogCards);

await mkdir(dirname(outputPath), { recursive: true });
if (catalogChanged) {
  await writeFile(outputPath, `${JSON.stringify({
    source: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    cards: catalogCards,
  })}\n`, 'utf8');
}

if (catalogChanged) {
  console.log(`Wrote ${catalogCards.length} cards and ${downloaded} new thumbnails to ${outputPath}`);
} else {
  console.log(`Catalog unchanged at ${catalogCards.length} cards; downloaded ${downloaded} missing thumbnails.`);
}
