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

## Supplemental printings

The upstream snapshot can briefly lag newly released special printings. RiftList keeps narrowly scoped supplements in `src/catalog.ts` when a verified printing is missing, and automatically stops adding one when upstream begins supplying it.

The current supplement is Vendetta `VEN-192*/166`, **Nasus, Curator of the Sands (Signed Showcase)**. Its printing metadata is corroborated by the public [Rift Atlas entry](https://riftatlas.com/card/VEN-192S), and its bundled preview comes from the public [TCGplayer image](https://tcgplayer-cdn.tcgplayer.com/product/709304_in_1000x1000.jpg). The ordinary `VEN-192/166` artwork remains sourced through the normal Riot gallery pipeline.

## Refresh policy

The **Update Riftbound card data** GitHub Actions workflow runs every Tuesday at 04:23 UTC and can also be started manually. It synchronizes the catalog, runs the tests and production build, commits only changed catalog assets, and deploys the refreshed Pages site. Existing thumbnails are reused when their image hash is unchanged.

The sync is deterministic: an unchanged catalog preserves its generation timestamp and produces no commit. It rejects duplicate card IDs, catalog reductions above five percent, and updates containing more than 500 previously unseen card IDs. These limits make unexpectedly broad upstream changes fail for manual review instead of publishing automatically.

For local maintenance, run `pnpm run data:sync`, review the resulting catalog and card count, and run `pnpm test` plus `pnpm run build` before committing changed assets.

## Offline behavior

`public/service-worker.js` caches the application shell and catalog during installation. Same-origin thumbnails are cached as the browser requests them, so cards that have been viewed remain available offline. A first visit and never-viewed card art still require a network connection.

## Rights and attribution

The RiftList [MIT License](./LICENSE) covers RiftList's original source code only. The dataset pipeline code is published by its author under its repository terms. Card names, rules data, artwork, and trademarks remain Riot Games property and are not relicensed by RiftList. RiftList is an unofficial, non-commercial fan project and is not endorsed by Riot Games.
