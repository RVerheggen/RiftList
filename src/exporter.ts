import { cardVariantLabel } from './matcher';
import type { OutputStyle, WantedCard } from './types';

const COLORS = {
  paper: '#f5f1e8',
  ink: '#171e1a',
  muted: '#6f7972',
  line: '#d2cec3',
  accent: '#ef623d',
  white: '#fffefa',
};

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawContained(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawPlaceholder(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.fillStyle = '#2b352f';
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#4d5a52';
  context.lineWidth = 4;
  for (let offset = -height; offset < width; offset += 44) {
    context.beginPath();
    context.moveTo(x + offset, y + height);
    context.lineTo(x + offset + height, y);
    context.stroke();
  }
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawHeader(context: CanvasRenderingContext2D, width: number, total: number, unique: number) {
  context.fillStyle = COLORS.ink;
  context.fillRect(0, 0, width, 164);
  context.fillStyle = COLORS.accent;
  context.font = '900 66px Georgia, serif';
  context.fillText('WANTED', 54, 86);
  context.fillStyle = '#aeb8b1';
  context.font = '700 20px Arial, sans-serif';
  context.letterSpacing = '2px';
  context.fillText('RIFTBOUND TRADE LIST', 58, 125);
  context.textAlign = 'right';
  context.fillStyle = COLORS.white;
  context.font = '800 26px Arial, sans-serif';
  context.fillText(`${total} CARDS`, width - 54, 78);
  context.fillStyle = '#89958d';
  context.font = '600 18px Arial, sans-serif';
  context.fillText(`${unique} unique wants`, width - 54, 113);
  context.textAlign = 'left';
  context.letterSpacing = '0px';
}

function drawFooter(context: CanvasRenderingContext2D, width: number, height: number) {
  context.strokeStyle = COLORS.line;
  context.beginPath();
  context.moveTo(54, height - 64);
  context.lineTo(width - 54, height - 64);
  context.stroke();
  context.fillStyle = COLORS.muted;
  context.font = '700 16px Arial, sans-serif';
  context.fillText('MADE WITH RIFTLIST', 54, height - 31);
  context.textAlign = 'right';
  context.fillText('READY TO TRADE', width - 54, height - 31);
  context.textAlign = 'left';
}

function ellipsize(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

async function renderGrid(items: WantedCard[], images: Array<HTMLImageElement | null>) {
  const width = 1080;
  const columns = 3;
  const gap = 24;
  const side = 54;
  const tileWidth = (width - side * 2 - gap * (columns - 1)) / columns;
  const artHeight = 411;
  const tileHeight = 483;
  const rows = Math.ceil(items.length / columns);
  const height = 164 + 40 + rows * tileHeight + Math.max(0, rows - 1) * gap + 96;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = COLORS.paper;
  context.fillRect(0, 0, width, height);
  drawHeader(context, width, items.reduce((sum, item) => sum + item.quantity, 0), items.length);

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = side + column * (tileWidth + gap);
    const y = 204 + row * (tileHeight + gap);
    roundedRect(context, x, y, tileWidth, tileHeight, 12);
    context.fillStyle = COLORS.white;
    context.fill();
    context.save();
    roundedRect(context, x, y, tileWidth, artHeight, 12);
    context.clip();
    drawPlaceholder(context, x, y, tileWidth, artHeight);
    const image = images[index];
    if (image) drawContained(context, image, x, y, tileWidth, artHeight);
    context.restore();

    roundedRect(context, x + tileWidth - 66, y + 12, 52, 40, 20);
    context.fillStyle = COLORS.accent;
    context.fill();
    context.fillStyle = COLORS.white;
    context.font = '900 20px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(`${item.quantity}×`, x + tileWidth - 40, y + 39);
    context.textAlign = 'left';

    context.fillStyle = COLORS.ink;
    context.font = '800 17px Arial, sans-serif';
    context.fillText(ellipsize(context, item.card.name, tileWidth - 28), x + 14, y + artHeight + 27);
    context.fillStyle = COLORS.muted;
    context.font = '700 13px Arial, sans-serif';
    const detail = [item.card.publicCode, cardVariantLabel(item.card)].filter(Boolean).join(' · ');
    context.fillText(ellipsize(context, detail, tileWidth - 28), x + 14, y + artHeight + 52);
  });
  drawFooter(context, width, height);
  return canvas;
}

async function renderList(items: WantedCard[], images: Array<HTMLImageElement | null>, compact: boolean) {
  const width = 1080;
  const side = 54;
  const columns = compact ? 2 : 1;
  const columnGap = compact ? 22 : 0;
  const rowHeight = compact ? 126 : 210;
  const rows = Math.ceil(items.length / columns);
  const height = 164 + 34 + rows * rowHeight + 92;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = COLORS.paper;
  context.fillRect(0, 0, width, height);
  drawHeader(context, width, items.reduce((sum, item) => sum + item.quantity, 0), items.length);
  const columnWidth = (width - side * 2 - columnGap) / columns;

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = side + column * (columnWidth + columnGap);
    const y = 198 + row * rowHeight;
    const thumbnailWidth = compact ? 72 : 118;
    const thumbnailHeight = compact ? 100 : 165;

    context.strokeStyle = COLORS.line;
    context.beginPath();
    context.moveTo(x, y + rowHeight - 12);
    context.lineTo(x + columnWidth, y + rowHeight - 12);
    context.stroke();

    context.save();
    roundedRect(context, x, y, thumbnailWidth, thumbnailHeight, 8);
    context.clip();
    drawPlaceholder(context, x, y, thumbnailWidth, thumbnailHeight);
    const image = images[index];
    if (image) drawContained(context, image, x, y, thumbnailWidth, thumbnailHeight);
    context.restore();

    const textX = x + thumbnailWidth + (compact ? 18 : 28);
    const maxTextWidth = columnWidth - thumbnailWidth - (compact ? 28 : 42);
    context.fillStyle = COLORS.accent;
    context.font = compact ? '900 24px Arial, sans-serif' : '900 34px Arial, sans-serif';
    context.fillText(`${item.quantity}×`, textX, y + (compact ? 29 : 47));
    context.fillStyle = COLORS.ink;
    context.font = compact ? '800 19px Arial, sans-serif' : '800 30px Arial, sans-serif';
    context.fillText(ellipsize(context, item.card.name, maxTextWidth), textX, y + (compact ? 58 : 91));
    context.fillStyle = COLORS.muted;
    context.font = compact ? '700 13px Arial, sans-serif' : '700 18px Arial, sans-serif';
    const detail = [item.card.publicCode, item.card.setName, cardVariantLabel(item.card)].filter(Boolean).join(' · ');
    context.fillText(ellipsize(context, detail, maxTextWidth), textX, y + (compact ? 82 : 126));
  });
  drawFooter(context, width, height);
  return canvas;
}

export async function createWantedImage(items: WantedCard[], style: OutputStyle) {
  const images = await Promise.all(items.map((item) => loadImage(new URL(item.card.imagePath, document.baseURI).toString())));
  const canvas = style === 'grid'
    ? await renderGrid(items, images)
    : await renderList(items, images, style === 'compact');
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to create the PNG image.')), 'image/png');
  });
}

export function downloadWantedImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `riftlist-wanted-${new Date().toISOString().slice(0, 10)}.png`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
