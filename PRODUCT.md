# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

RiftList is for Riftbound players and traders who prepare wanted-card lists for group chats, especially WhatsApp trading groups. The primary usage context is mobile, often while the user is already participating in a trade conversation.

## Product Purpose

RiftList turns loosely formatted wanted-card text into a clear, recognizable, and shareable Riftbound card list. Success means a user can paste an imperfect list, resolve the intended printings, see any uncertain matches, and quickly share either a phone-readable image or plain text.

## Positioning

RiftList accepts the informal list formats players already use and converts them directly into a polished trade artifact without requiring an account, tracking, or a backend.

## Operating Context

- Users paste card lists copied or typed from messages, notes, deck tools, and trading conversations.
- Input may contain bullets, inconsistent spacing or casing, quantities before or after names, small typos, card codes, and printing shorthand.
- Users review matched card images and quantities, correct uncertain matches, choose an output layout, then copy text or save or share a PNG through their phone.
- WhatsApp group chats are the primary sharing destination, while the exported text and images remain usable in other messaging tools.

## Capabilities and Constraints

- The app is a static, single-page frontend hosted on GitHub Pages.
- Mobile-first operation is a permanent constraint.
- There is no server, account system, database, tracking requirement, API key, or private backend.
- Card matching uses a bundled normalized catalog and locally optimized card thumbnails.
- The app should remain usable offline after the relevant shell, data, and images have been cached where browser capabilities allow.
- Supported output includes copyable plain text and client-side PNG generation in grid, list, and compact layouts.
- Unmatched or uncertain input must remain visible and actionable rather than being silently discarded.
- Variant terminology includes Alternate art, Signed Showcase, and Overnumbered. Accepted shorthand includes AA, Sig, and ON.
- Literal em dash characters must never appear in the interface, source code, documentation, or generated output.

## Brand Commitments

- The product name is RiftList.
- RiftList is an unofficial, non-commercial fan tool and must not imply affiliation with or endorsement by Riot Games.
- The product should remain practical, direct, trade-friendly, and focused on completing the user's task rather than presenting a marketing landing page.

## Evidence on Hand

- The bundled catalog and optimized thumbnails provide real Riftbound card names, identifiers, printing metadata, and artwork for matching and export.
- The data source, synchronization approach, third-party rights boundary, and supplemental-printing policy are documented in `DATA_SOURCES.md`.
- Automated domain tests cover parsing, matching, printing aliases, display terminology, and the repository-wide em dash restriction.
- No testimonials, usage metrics, partnerships, Riot endorsement, or commercial claims are established and future work must not fabricate them.

## Product Principles

1. Meet traders where they are by accepting messy, human-written lists.
2. Make matching transparent by showing recognizable cards and clearly surfacing uncertainty.
3. Optimize the full workflow for fast, one-handed mobile use from paste to share.
4. Keep the product dependable and privacy-friendly through static hosting, bundled data, and no required account or backend.
5. Preserve clear legal separation from Riot Games and do not present third-party card assets as RiftList-owned material.
