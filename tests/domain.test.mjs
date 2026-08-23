import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { applyCatalogSupplements } from '../src/catalog.ts';
import { cardVariantLabel, formatWantedText, matchCard } from '../src/matcher.ts';
import { parseCardLine, variantLabel } from '../src/parser.ts';

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
