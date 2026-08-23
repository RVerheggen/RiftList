# RiftList

RiftList is a static, mobile-first Riftbound trade-list maker. Paste a wanted list, match it against the bundled card catalog, then copy WhatsApp-ready text or save a clean PNG card sheet. There is no backend, account, database, API key, or runtime card API.

## Features

- Quantities before or after names, with or without `x`: `2 Ahri, Alluring`, `Ahri, Alluring 2`, and `2x Ahri, Alluring`
- Bullets, blank lines, inconsistent spacing/casing, and small typos
- Variant aliases: `(AA)` / `alt` for Alternate art, `(Sig)` for Signed Showcase, and `(ON)` for Overnumbered
- Exact Riftbound card codes and full IDs
- Clear unmatched feedback with likely-name suggestions
- Grid, list, and compact share layouts
- Copyable plain text plus client-side PNG export
- Bundled data and optimized thumbnails; a service worker caches the app and viewed assets for later offline use

## Local development

Requirements: Node.js 22 or newer and pnpm.

```bash
pnpm install
pnpm run dev
```

Open the local URL printed by Vite. A production check is:

```bash
pnpm run build
pnpm run preview
```

The static output is written to `dist/`.

## Updating card data

The checked-in catalog and thumbnails make deployed builds independent from a live API. Refresh them with:

```bash
pnpm run data:sync
```

This downloads the latest public snapshot, normalizes the fields RiftList uses, and adds any missing 320-pixel WebP thumbnails. See [DATA_SOURCES.md](./DATA_SOURCES.md) for source, rights, and caching details.

## Deploying to GitHub Pages

The included workflow at `.github/workflows/deploy-pages.yml` builds and deploys every push to `main`.

1. Push the project to a GitHub repository with `main` as its default branch.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy RiftList to GitHub Pages** manually from the Actions tab.

Vite uses relative asset paths (`base: './'`), so the same build works for both an account-level Pages site and a repository subpath such as `/RiftList/`.

## Legal

RiftList source code is available under the [MIT License](./LICENSE). This license covers RiftList's original code only. It does not grant rights to third-party card data, images, names, or trademarks.

RiftList is an unofficial, non-commercial fan tool and is not affiliated with or endorsed by Riot Games. Riftbound, card names, card data, artwork, and trademarks are property of Riot Games. The bundled dataset and thumbnails are provided for community-tool functionality; review the source policies in [DATA_SOURCES.md](./DATA_SOURCES.md) before redistributing or commercializing the project.
