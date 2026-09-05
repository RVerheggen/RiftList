import type { ExportPreferences, GroupField, SortField, WantedCard } from './types';

export interface ExportPage {
  items: WantedCard[];
  groupLabel?: string;
}

export function wantedImageFilename(index: number, total: number, date = new Date().toISOString().slice(0, 10)) {
  const width = Math.max(2, String(total).length);
  const page = String(index + 1).padStart(width, '0');
  const pageCount = String(total).padStart(width, '0');
  return `riftlist-wanted-${page}-of-${pageCount}-${date}.png`;
}

const SET_ORDER = ['Origins', 'Proving Grounds', 'Spiritforged', 'Unleashed', 'Vendetta'];

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function domainOf(item: WantedCard) {
  return item.card.domains?.[0] || 'No domain';
}

function numericValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function compareBy(field: SortField, left: WantedCard, right: WantedCard) {
  if (field === 'input') return 0;
  if (field === 'energy') return numericValue(left.card.energy) - numericValue(right.card.energy);
  if (field === 'might') return numericValue(left.card.might) - numericValue(right.card.might);
  const values: Record<Exclude<SortField, 'input' | 'energy' | 'might'>, [string, string]> = {
    name: [left.card.name, right.card.name],
    domain: [domainOf(left), domainOf(right)],
    rarity: [left.card.rarity, right.card.rarity],
    set: [left.card.setName, right.card.setName],
    type: [left.card.type, right.card.type],
  };
  const [leftValue, rightValue] = values[field];
  return compareText(leftValue, rightValue);
}

function groupValue(field: Exclude<GroupField, 'none'>, item: WantedCard) {
  if (field === 'domain') return domainOf(item);
  if (field === 'set') return item.card.setName || 'Unknown set';
  if (field === 'rarity') return item.card.rarity || 'Unknown rarity';
  return item.card.type || 'Unknown type';
}

function compareGroups(field: Exclude<GroupField, 'none'>, left: string, right: string) {
  if (field !== 'set') return 0;
  const leftIndex = SET_ORDER.indexOf(left);
  const rightIndex = SET_ORDER.indexOf(right);
  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) return 1;
    if (rightIndex < 0) return -1;
    return leftIndex - rightIndex;
  }
  return compareText(left, right);
}

function chunks<T>(items: T[], maximum: number) {
  return Array.from({ length: Math.ceil(items.length / maximum) }, (_, index) => items.slice(index * maximum, (index + 1) * maximum));
}

export function prepareExportPages(items: WantedCard[], preferences: Pick<ExportPreferences, 'cardsPerImage' | 'style' | 'sortBy' | 'groupBy'>): ExportPage[] {
  const maximum = Math.max(1, Math.min(24, Math.trunc(preferences.cardsPerImage[preferences.style])));
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((left, right) => compareBy(preferences.sortBy, left.item, right.item) || left.index - right.index);

  if (preferences.groupBy === 'none') {
    return chunks(indexed.map(({ item }) => item), maximum).map((pageItems) => ({ items: pageItems }));
  }

  const groups = new Map<string, WantedCard[]>();
  for (const { item } of indexed) {
    const label = groupValue(preferences.groupBy, item);
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareGroups(preferences.groupBy as Exclude<GroupField, 'none'>, left, right))
    .flatMap(([groupLabel, groupItems]) => chunks(groupItems, maximum).map((pageItems) => ({ items: pageItems, groupLabel })));
}
