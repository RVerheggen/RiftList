import type { Card } from './types';

const NASUS_FULL_NAME = 'Nasus, Curator of the Sands';
const NASUS_SHORT_NAME = 'Curator of the Sands';

function withAlias(card: Card, alias: string) {
  return { ...card, aliases: [...new Set([...(card.aliases ?? []), alias])] };
}

export function applyCatalogSupplements(cards: Card[]) {
  const cardsWithAliases = cards.map((card) => {
    const isNasusCurator = card.set === 'VEN'
      && [145, 192].includes(card.collectorNumber)
      && [NASUS_FULL_NAME, NASUS_SHORT_NAME].includes(card.name);
    if (!isNasusCurator) return card;
    return withAlias(card, card.name === NASUS_FULL_NAME ? NASUS_SHORT_NAME : NASUS_FULL_NAME);
  });

  const signedPrintingExists = cardsWithAliases.some((card) => (
    card.set === 'VEN' && card.collectorNumber === 192 && card.isSigned
  ));
  if (signedPrintingExists) return cardsWithAliases;

  const showcase = cardsWithAliases.find((card) => card.id === 'ven-192-166');
  if (!showcase) return cardsWithAliases;

  const signedShowcase: Card = {
    ...showcase,
    id: 'ven-192-star-166',
    code: 'VEN-192*',
    publicCode: 'VEN-192*/166',
    name: NASUS_FULL_NAME,
    aliases: [NASUS_SHORT_NAME],
    rarity: 'Showcase',
    isAltArt: false,
    isSigned: true,
    isVariant: true,
    imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/709304_in_1000x1000.jpg',
    imagePath: 'images/ven-192-star-166-tcgplayer-709304.jpg',
  };

  return [...cardsWithAliases, signedShowcase];
}
