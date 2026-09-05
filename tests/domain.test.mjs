import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { applyCatalogSupplements } from '../src/catalog.ts';
import { cardVariantLabel, formatExportedWantedText, formatWantedText, matchCard } from '../src/matcher.ts';
import { parseCardLine, variantLabel } from '../src/parser.ts';
import { prepareExportPages, wantedImageFilename } from '../src/export-preparation.ts';

const rawCatalog = JSON.parse(await readFile(new URL('../public/data/cards.json', import.meta.url), 'utf8'));
const cards = applyCatalogSupplements(rawCatalog.cards);

test('Sig requests the Signed Showcase printing by a shortened card name', () => {
  const parsed = parseCardLine('1x Curator of the Sands (Sig)');
  assert.ok(parsed);
  assert.equal(parsed.variant, 'signed-showcase');

  const result = matchCard(parsed, cards);
  assert.equal(result.kind, 'exact');
  assert.equal(result.card?.id, 'ven-192-star-166');
  assert.equal(result.card?.publicCode, 'VEN-192*/166');
  assert.equal(cardVariantLabel(result.card), 'Signed Showcase');
});

test('the full marketplace name and verbose variant note are understood', () => {
  const parsed = parseCardLine('Nasus, Curator of the Sands (V.3 - Signed Showcase)');
  assert.ok(parsed);
  assert.equal(parsed.variant, 'signed-showcase');
  assert.equal(matchCard(parsed, cards).card?.id, 'ven-192-star-166');
});

test('variant labels use the intended display capitalization', () => {
  assert.equal(variantLabel('alternate-art'), 'Alternate art');
  assert.equal(variantLabel('signed-showcase'), 'Signed Showcase');
  assert.equal(variantLabel('overnumbered'), 'Overnumbered');
});

test('quantities work before or after a card name without an x', () => {
  const leading = parseCardLine('2 Decree of Rage');
  const trailing = parseCardLine('Decree of Rage 2');

  assert.equal(leading?.quantity, 2);
  assert.equal(leading?.name, 'Decree of Rage');
  assert.equal(trailing?.quantity, 2);
  assert.equal(trailing?.name, 'Decree of Rage');
  assert.equal(matchCard(leading, cards).kind, 'exact');
  assert.equal(matchCard(trailing, cards).kind, 'exact');
});

test('bare quantities preserve variant notes and x quantities remain supported', () => {
  const bare = parseCardLine('2 Nasus, Ascended (AA)');
  const withX = parseCardLine('Nasus, Ascended (AA) 2x');

  assert.equal(bare?.quantity, 2);
  assert.equal(bare?.variant, 'alternate-art');
  assert.equal(withX?.quantity, 2);
  assert.equal(withX?.variant, 'alternate-art');
});

test('plain-text wanted lists use the shared output title', () => {
  const card = cards.find((candidate) => candidate.name === 'Ferrous Forerunner');
  assert.ok(card);

  const output = formatWantedText([{ card, quantity: 2, fuzzySources: [] }], []);
  assert.equal(output.split('\n')[0], 'Riftbound wanted list');
  assert.match(output, /2x Ferrous Forerunner/);
});

test('shared text follows the exported page order and uses group headings', () => {
  const card = cards.find((candidate) => candidate.name === 'Ferrous Forerunner');
  assert.ok(card);
  const secondCard = cards.find((candidate) => candidate.name === 'Ashe, Focused');
  assert.ok(secondCard);
  const output = formatExportedWantedText([
    { groupLabel: 'Calm', items: [{ card: secondCard, quantity: 1, fuzzySources: [] }] },
    { groupLabel: 'Fury', items: [{ card, quantity: 2, fuzzySources: [] }] },
  ], []);
  assert.match(output, /CALM\n1x Ashe, Focused[\s\S]*FURY\n2x Ferrous Forerunner/);
  assert.doesNotMatch(output, /Sorted by|Grouped by/);
});

test('export image filenames preserve lexical page order', () => {
  assert.equal(wantedImageFilename(1, 12, '2026-09-05'), 'riftlist-wanted-02-of-12-2026-09-05.png');
  assert.equal(wantedImageFilename(9, 12, '2026-09-05'), 'riftlist-wanted-10-of-12-2026-09-05.png');
});

test('ON selects the normal overnumbered printing while Sig selects Signed Showcase', () => {
  const cases = [
    ['Scorn of the Moon', 'unl-234-219', 'unl-234-star-219'],
    ['Voidreaver', 'unl-236-219', 'unl-236-star-219'],
  ];

  for (const [name, overnumberedId, signedId] of cases) {
    const overnumbered = parseCardLine(`1x ${name} (ON)`);
    const signed = parseCardLine(`1x ${name} (Sig)`);
    assert.ok(overnumbered);
    assert.ok(signed);

    const overnumberedCard = matchCard(overnumbered, cards).card;
    const signedCard = matchCard(signed, cards).card;
    assert.equal(overnumberedCard?.id, overnumberedId);
    assert.equal(overnumberedCard?.isSigned, false);
    assert.equal(cardVariantLabel(overnumberedCard), 'Overnumbered');
    assert.equal(signedCard?.id, signedId);
    assert.equal(signedCard?.isSigned, true);
    assert.equal(cardVariantLabel(signedCard), 'Signed Showcase');
  }
});

function wantedCard(name, overrides = {}) {
  return {
    quantity: 1,
    fuzzySources: [],
    card: {
      id: name.toLowerCase(), code: 'TST-001', publicCode: 'TST-001/001', set: 'TST', setName: 'Origins', collectorNumber: 1,
      name, type: 'Unit', rarity: 'Common', domains: ['Fury'], energy: 3, might: 2, power: null,
      orientation: 'portrait', isAltArt: false, isSigned: false, isVariant: false, imageUrl: '', imagePath: '', ...overrides,
    },
  };
}

test('export preparation preserves input order and chunks by the selected layout limit', () => {
  const cards = [wantedCard('Third'), wantedCard('First'), wantedCard('Second')];
  const pages = prepareExportPages(cards, { style: 'grid', cardsPerImage: { grid: 2, list: 8, compact: 16 }, sortBy: 'input', groupBy: 'none' });
  assert.deepEqual(pages.map((page) => page.items.map((item) => item.card.name)), [['Third', 'First'], ['Second']]);
});

test('export preparation sorts numeric values with missing values last', () => {
  const cards = [wantedCard('Missing', { energy: null }), wantedCard('High', { energy: 7 }), wantedCard('Low', { energy: 1 })];
  const pages = prepareExportPages(cards, { style: 'grid', cardsPerImage: { grid: 12, list: 8, compact: 16 }, sortBy: 'energy', groupBy: 'none' });
  assert.deepEqual(pages[0].items.map((item) => item.card.name), ['Low', 'High', 'Missing']);
});

test('export preparation keeps groups on separate pages and uses the first domain', () => {
  const cards = [
    wantedCard('Fury one'), wantedCard('Fury two'), wantedCard('Fury three'), wantedCard('Dual', { domains: ['Calm', 'Chaos'] }),
  ];
  const pages = prepareExportPages(cards, { style: 'grid', cardsPerImage: { grid: 2, list: 8, compact: 16 }, sortBy: 'input', groupBy: 'domain' });
  assert.deepEqual(pages.map((page) => [page.groupLabel, page.items.map((item) => item.card.name)]), [
    ['Fury', ['Fury one', 'Fury two']], ['Fury', ['Fury three']], ['Calm', ['Dual']],
  ]);
});

test('set grouping follows Riftbound release order', () => {
  const cards = [wantedCard('Vendetta', { setName: 'Vendetta' }), wantedCard('Unleashed', { setName: 'Unleashed' }), wantedCard('Origins', { setName: 'Origins' })];
  const pages = prepareExportPages(cards, { style: 'grid', cardsPerImage: { grid: 12, list: 8, compact: 16 }, sortBy: 'input', groupBy: 'set' });
  assert.deepEqual(pages.map((page) => page.groupLabel), ['Origins', 'Unleashed', 'Vendetta']);
});
