import type { ParsedLine, VariantRequest } from './types';

const VARIANT_ALIASES: Array<[RegExp, VariantRequest]> = [
  [/^(?:aa|alt|alternate(?:\s+art)?)$/i, 'alternate-art'],
  [/^(?:(?:v(?:ersion)?\.?\s*\d+)\s*[-–:]\s*)?(?:sig|signature|signed(?:\s+showcase)?)$/i, 'signed-showcase'],
  [/^(?:on|overnumbered|overnumber)$/i, 'overnumbered'],
];

function readVariant(value: string): VariantRequest | undefined {
  return VARIANT_ALIASES.find(([pattern]) => pattern.test(value.trim()))?.[1];
}

function cleanBullet(value: string) {
  return value.trim().replace(/^(?:[-*+•‣▪–]|\d+[.)])\s*/, '').trim();
}

export function parseCardLine(rawLine: string, lineNumber = 1): ParsedLine | null {
  let value = cleanBullet(rawLine);
  if (!value) return null;

  const leadingQuantity = value.match(/^(\d{1,3})(?:\s*[x×]\s*|\s+)(.+)$/i);
  const trailingQuantity = value.match(/^(.+?)\s+(\d{1,3})(?:\s*[x×])?\s*$/i);
  const quantity = Math.min(999, Math.max(1, Number(leadingQuantity?.[1] ?? trailingQuantity?.[2] ?? 1)));
  value = (leadingQuantity?.[2] ?? trailingQuantity?.[1] ?? value).trim();

  const notes: string[] = [];
  while (true) {
    const noteMatch = value.match(/\s*\(([^()]*)\)\s*$/);
    if (!noteMatch) break;
    notes.unshift(...noteMatch[1].split(/[,/|]/).map((note) => note.trim()).filter(Boolean));
    value = value.slice(0, noteMatch.index).trim();
  }

  let trailingVariant: VariantRequest | undefined;
  const variantSuffix = value.match(/\s+(aa|alt|alternate\s+art|sig|signature|signed(?:\s+showcase)?|on|overnumbered|overnumber)\s*$/i);
  if (variantSuffix) {
    trailingVariant = readVariant(variantSuffix[1]);
    value = value.slice(0, variantSuffix.index).trim();
  }

  const variant = notes.map(readVariant).find(Boolean) ?? trailingVariant;
  const setHint = notes.find((note) => !readVariant(note));

  if (!value) return null;
  return {
    lineNumber,
    original: rawLine.trim(),
    quantity,
    name: value,
    notes,
    setHint,
    variant,
  };
}

export function parseCardList(value: string): ParsedLine[] {
  return value
    .split(/\r?\n/)
    .map((line, index) => parseCardLine(line, index + 1))
    .filter((line): line is ParsedLine => line !== null);
}

export function variantLabel(variant?: VariantRequest) {
  if (variant === 'alternate-art') return 'Alternate art';
  if (variant === 'signed-showcase') return 'Signed Showcase';
  if (variant === 'overnumbered') return 'Overnumbered';
  return undefined;
}
