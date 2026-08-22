# Card data and image sources

## Runtime source

RiftList ships a normalized snapshot at `public/data/cards.json` and optimized WebP thumbnails under `public/images/`. The deployed app makes no card-data API calls. This is intentional: GitHub Pages remains fully static, matching is fast, and a previously loaded app can work without a network connection.

## Upstream data

The snapshot is downloaded from the open [slimtreble/Riftbound-card-data](https://github.com/slimtreble/Riftbound-card-data) dataset. That project extracts the card records embedded in Riot’s public [Riftbound card gallery](https://playriftbound.com/en-us/card-gallery/) and exposes direct Riot/Sanity image URLs. The sync script keeps only the fields needed for matching, display, and export.

The repository’s `scripts/sync-card-data.mjs` script:

1. Downloads the upstream `cards.json` snapshot.
2. Validates and normalizes the records used by RiftList.
3. Requests 320-pixel WebP renditions from the public Riot/Sanity asset source.
4. Writes a self-contained catalog whose cards point at those local thumbnails.

Local thumbnails are required for reliable client-side PNG export. The original Riot CDN images can be displayed cross-origin, but their response headers do not permit a static site to read them back through an HTML canvas. Bundling small renditions avoids a proxy or backend and reduces the image payload from roughly 1 GB of originals to about 21 MB for the current full catalog.

## Refresh policy

Run `pnpm run data:sync` when a new set or gallery update lands, review the resulting catalog/card count, run `pnpm run build`, and commit the changed snapshot plus any new thumbnails. Existing thumbnails are reused when their image hash is unchanged.

## Offline behavior

`public/service-worker.js` caches the application shell and catalog during installation. Same-origin thumbnails are cached as the browser requests them, so cards that have been viewed remain available offline. A first visit and never-viewed card art still require a network connection.

## Rights and attribution

The dataset pipeline code is published by its author under its repository terms. Card names, rules data, artwork, and trademarks remain Riot Games property and are not relicensed by RiftList. RiftList is an unofficial, non-commercial fan project and is not endorsed by Riot Games.
