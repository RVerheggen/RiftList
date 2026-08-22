export interface Card {
  id: string;
  code: string;
  publicCode: string;
  set: string;
  setName: string;
  collectorNumber: number;
  name: string;
  type: string;
  rarity: string;
  orientation: 'portrait' | 'landscape';
  isAltArt: boolean;
  isSigned: boolean;
  isVariant: boolean;
  imageUrl: string;
  imagePath: string;
}

export interface CardCatalog {
  source: string;
  generatedAt: string;
  cards: Card[];
}

export type VariantRequest = 'alternate-art' | 'signature' | 'overnumbered';

export interface ParsedLine {
  lineNumber: number;
  original: string;
  quantity: number;
  name: string;
  notes: string[];
  setHint?: string;
  variant?: VariantRequest;
}

export interface MatchResult {
  parsed: ParsedLine;
  card?: Card;
  kind: 'exact' | 'fuzzy' | 'unmatched';
  suggestions: Card[];
  message?: string;
}

export interface WantedCard {
  card: Card;
  quantity: number;
  fuzzySources: string[];
}

export type OutputStyle = 'grid' | 'list' | 'compact';
