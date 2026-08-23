import type { Card, MatchResult, ParsedLine, WantedCard } from './types';
import { variantLabel } from './parser.ts';

export function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}*]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeId(value: string) {
  const normalized = value.trim().toLocaleLowerCase().replace('/', '-');
  const fullId = normalized.match(/^([a-z]{2,8})-(\d+[a-z*]?)-0*(\d+)$/);
  return fullId ? `${fullId[1]}-${fullId[2]}-${Number(fullId[3])}` : normalized;
}

function isOvernumbered(card: Card) {
  const total = Number(card.publicCode.match(/\/(\d+)$/)?.[1]);
  return !card.isSigned && Number.isFinite(total) && card.collectorNumber > total;
}

function hasRequestedVariant(card: Card, parsed: ParsedLine) {
  if (parsed.variant === 'alternate-art') return card.isAltArt;
  if (parsed.variant === 'signed-showcase') return card.isSigned;
  if (parsed.variant === 'overnumbered') return isOvernumbered(card);
  return true;
}

function cardNames(card: Card) {
  return [card.name, ...(card.aliases ?? [])];
}

function hasExactName(card: Card, normalizedName: string) {
  return cardNames(card).some((name) => normalize(name) === normalizedName);
}

function bestNameSimilarity(card: Card, normalizedName: string) {
  return Math.max(...cardNames(card).map((name) => similarity(normalizedName, normalize(name))));
}

function matchesSet(card: Card, setHint?: string) {
  if (!setHint) return true;
  const hint = normalize(setHint);
  return [card.set, card.setName, card.code, card.publicCode].some((value) => normalize(value).includes(hint));
}

function preferPrinting(cards: Card[], parsed: ParsedLine) {
  const eligible = cards.filter((card) => hasRequestedVariant(card, parsed) && matchesSet(card, parsed.setHint));
  const pool = eligible.length ? eligible : [];
  return [...pool].sort((left, right) => {
    if (!parsed.variant && left.isVariant !== right.isVariant) return left.isVariant ? 1 : -1;
    return left.set.localeCompare(right.set) || left.collectorNumber - right.collectorNumber;
  })[0];
}

function levenshtein(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function similarity(query: string, candidate: string) {
  if (query === candidate) return 1;
  const editScore = 1 - levenshtein(query, candidate) / Math.max(query.length, candidate.length, 1);
  const queryWords = query.split(' ');
  const candidateWords = candidate.split(' ');
  const wordHits = queryWords.filter((word) => candidateWords.some((candidateWord) => candidateWord.includes(word) || word.includes(candidateWord))).length;
  const tokenScore = wordHits / Math.max(queryWords.length, candidateWords.length, 1);
  const containment = candidate.includes(query) || query.includes(candidate) ? 0.92 : 0;
  return Math.max(editScore, editScore * 0.72 + tokenScore * 0.28, containment);
}

function uniqueNames(cards: Card[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = normalize(card.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function matchCard(parsed: ParsedLine, cards: Card[]): MatchResult {
  const normalizedName = normalize(parsed.name);
  const normalizedInputId = normalizeId(parsed.name);
  const idMatches = cards.filter((card) => [card.id, card.code, card.publicCode].some((id) => normalizeId(id) === normalizedInputId));
  const exactMatches = idMatches.length ? idMatches : cards.filter((card) => hasExactName(card, normalizedName));

  if (exactMatches.length) {
    const card = preferPrinting(exactMatches, parsed);
    if (card) return { parsed, card, kind: 'exact', suggestions: [] };
    const requested = parsed.variant ? variantLabel(parsed.variant) : parsed.setHint;
    return {
      parsed,
      kind: 'unmatched',
      suggestions: uniqueNames(exactMatches).slice(0, 3),
      message: requested ? `The card exists, but no ${requested} printing was found.` : undefined,
    };
  }

  const ranked = uniqueNames(cards)
    .map((card) => ({ card, score: bestNameSimilarity(card, normalizedName) }))
    .sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name));

  const bestName = ranked[0];
  if (bestName && bestName.score >= 0.8) {
    const sameName = cards.filter((card) => normalize(card.name) === normalize(bestName.card.name));
    const card = preferPrinting(sameName, parsed);
    if (card) return { parsed, card, kind: 'fuzzy', suggestions: ranked.slice(1, 4).map(({ card: suggestion }) => suggestion) };
  }

  return {
    parsed,
    kind: 'unmatched',
    suggestions: ranked.filter(({ score }) => score >= 0.35).slice(0, 3).map(({ card }) => card),
  };
}

export function matchCardList(parsedLines: ParsedLine[], cards: Card[]) {
  return parsedLines.map((parsed) => matchCard(parsed, cards));
}

export function aggregateMatches(results: MatchResult[]): WantedCard[] {
  const wanted = new Map<string, WantedCard>();
  results.forEach((result) => {
    if (!result.card) return;
    const current = wanted.get(result.card.id);
    if (current) {
      current.quantity += result.parsed.quantity;
      if (result.kind === 'fuzzy') current.fuzzySources.push(result.parsed.name);
    } else {
      wanted.set(result.card.id, {
        card: result.card,
        quantity: result.parsed.quantity,
        fuzzySources: result.kind === 'fuzzy' ? [result.parsed.name] : [],
      });
    }
  });
  return [...wanted.values()];
}

export function cardVariantLabel(card: Card) {
  if (card.isSigned) return 'Signed Showcase';
  if (card.isAltArt) return 'Alternate art';
  if (isOvernumbered(card)) return 'Overnumbered';
  return undefined;
}

export function formatWantedText(items: WantedCard[], unmatched: MatchResult[]) {
  const lines = items.map(({ card, quantity }) => {
    const detail = [card.publicCode, cardVariantLabel(card)].filter(Boolean).join(' · ');
    return `${quantity}x ${card.name}${detail ? ` · ${detail}` : ''}`;
  });
  const missing = unmatched.map(({ parsed }) => `${parsed.quantity}x ${parsed.name} · not matched`);
  return ['Riftbound wanted list', '', ...lines, ...(missing.length ? ['', 'UNMATCHED', ...missing] : [])].join('\n');
}
