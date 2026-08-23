---
name: RiftList
description: A calm editorial trade workspace built from warm paper, deep green, and practical card-shop details.
colors:
  signal-orange: "#ef623d"
  signal-orange-deep: "#da5130"
  warm-ivory: "#f4f1e9"
  paper-white: "#fffefa"
  deep-forest: "#171e1a"
  stone-canvas: "#e4e1d8"
  near-black-ink: "#152019"
  muted-ink: "#657068"
  divider: "#d7d4ca"
  badge-surface: "#eae7de"
  badge-ink: "#334039"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "clamp(38px, 4.5vw, 66px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "29px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.06em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 850
    letterSpacing: "0.15em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.65
rounded:
  xs: "5px"
  sm: "6px"
  md: "8px"
  control: "10px"
  panel: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "34px"
  panel-fluid: "clamp(26px, 4vw, 58px)"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.paper-white}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-orange-deep}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  button-dark:
    backgroundColor: "{colors.near-black-ink}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "13px"
  input-list:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.panel}"
    padding: "18px"
  format-badge:
    backgroundColor: "{colors.badge-surface}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "23px"
  wanted-board:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xs}"
    padding: "clamp(18px, 3vw, 34px)"
---

# Design System: RiftList

## Overview

**Creative North Star: "The Collector's Trade Desk"**

RiftList should feel like a well-kept card-shop counter prepared for a trade session: warm paper under hand, an orderly dark binder surface for the cards, and one controlled signal color for decisive actions. The interface is calm, editorial, and organized. It gives card artwork room to carry energy while the surrounding application remains composed.

The system is practical without becoming generic. Editorial serif headlines create identity, compact utility labels keep the tool efficient, and small physical details such as borders, clipped card frames, badges, and the offset board shadow make the static interface feel touchable. The overall depth model is mostly flat and selectively structural.

**Key Characteristics:**

- Warm paper workspace paired with a deep green-black trade surface
- Editorial serif display type with compact sans-serif utility copy
- Signal Orange reserved for actions, warnings, quantities, and short labels
- Mobile-first stacking with dense but legible card presentation
- Soft, approachable controls with restrained physical depth

## Colors

The palette combines quiet stationery neutrals with a deep collector-table surface and one clear action color.

### Primary

- **Signal Orange:** Used for the primary match action, section eyebrows, quantity badges, warning markers, and the WANTED title. It should remain a controlled signal rather than a general surface color.
- **Signal Orange Deep:** Used only for the primary action hover state.

### Neutral

- **Warm Ivory:** The main application background and topbar surface.
- **Paper White:** The cleanest input and card-tile surface.
- **Deep Forest:** The wanted-board background and the main dark export surface.
- **Stone Canvas:** The preview workspace that separates the generated artifact from the editor.
- **Near-Black Ink:** Primary text, dark buttons, and the favicon ground.
- **Muted Ink:** Supporting prose and low-priority explanatory text.
- **Divider:** Quiet borders between workspace regions and content groups.
- **Badge Surface and Badge Ink:** The paired neutral treatment for input-format shorthand.

**The Controlled Signal Rule.** Signal Orange marks the next action or the most important card-list fact. Do not spread it across large backgrounds or routine controls.

**The Dark Board Rule.** Deep Forest belongs to the share artifact and its strongest action, not to every container in the application.

## Typography

**Display Font:** Georgia with Times New Roman and serif fallbacks

**Body Font:** Inter with system sans-serif fallbacks

**Label/Mono Font:** System monospace for pasted lists and generated text

**Character:** The serif and sans-serif pairing separates collector personality from tool utility. Display copy feels editorial and established; controls, metadata, and input remain direct and highly scannable.

### Hierarchy

- **Display** (700, `clamp(38px, 4.5vw, 66px)`, 0.98): Used for the main task statement with tight tracking and compact line spacing.
- **Headline** (900, 29px, 1): Used for the WANTED title on the share board and in exported imagery.
- **Title** (800, 17px): Used for preview counts and prominent action labels.
- **Body** (400, 15px, 1.65): Used for short explanatory copy with comfortable reading rhythm.
- **Label** (850, 11px, 0.15em, uppercase): Used for eyebrows and compact section markers.
- **Mono** (600, 15px, 1.65): Used for pasted card lists and plain-text output.

**The Two Voices Rule.** Use serif type for identity-bearing statements and wanted-sheet headlines. Use sans-serif or monospace for every operational task.

## Layout

The desktop workspace is split between an editor and a larger preview area. The editor remains sticky while the preview centers content within a 760px maximum width. Fluid panel padding uses viewport-aware clamps so both halves retain breathing room on large screens.

At 900px and below, the workspace becomes a single vertical flow with the editor above the preview. At 560px and below, both panels use 16px side padding, the heading settles at 41px, toolbar controls stack, and export actions become full-width rows. Grid cards remain three across on phones because recognition and visual comparison are central to the task; compact results collapse to one column.

Spacing follows a practical 4px, 8px, 16px, 24px, and 34px rhythm, with larger fluid padding reserved for workspace regions. Keep action groups close to the artifact they affect and preserve clear separation between editing, previewing, error review, and exporting.

**The Paste-to-Share Rule.** On mobile, preserve the exact vertical workflow: input, match, preview, review, export.

## Elevation & Depth

RiftList is mostly flat and selectively structural. Borders and tonal shifts provide everyday separation. Ambient shadows make the input, primary action, active segmented control, badges, and toast feel touchable without turning them into floating cards. The wanted board uses a firm offset shadow as the one deliberate physical-layer gesture.

### Shadow Vocabulary

- **Input Ambient** (`0 7px 24px rgba(27, 35, 29, .05)`): Quiet separation for the pasted-list field.
- **Action Glow** (`0 8px 20px rgba(239, 98, 61, .2)`): Limited to the primary match action.
- **Selected Control** (`0 1px 4px rgba(20, 25, 22, .1)`): Marks the active output-style segment.
- **Board Offset** (`12px 14px 0 rgba(28, 35, 30, .11)`): Structural layer under the share artifact, reduced to `7px 8px` on phones.
- **Quantity Badge** (`0 2px 8px rgba(0, 0, 0, .35)`): Keeps quantity readable over card artwork.
- **Toast Lift** (`0 10px 32px rgba(0, 0, 0, .22)`): Separates temporary feedback from the page.

**The One Strong Shadow Rule.** Only the wanted board may use a hard offset shadow. All other elevation remains soft and low-contrast.

## Shapes

The form language is gently rounded and compact. Inputs and major feedback panels use 10px to 12px corners; controls and card frames use 5px to 9px corners; statuses, quantities, and temporary feedback use pill or circular forms. Thin borders remain visible enough to define edges against neighboring paper tones.

The brand mark, empty-card stack, and occasional fallback marks use small rotations between negative four and positive nine degrees. These are controlled collector-table gestures, not a general license to tilt content.

**The Quiet Corners Rule.** Use moderate radii that soften controls without turning every surface into a pill.

## Components

Components feel soft and approachable while retaining compact, trade-tool efficiency.

### Buttons

- **Shape:** Gently rounded controls with 9px to 10px corners.
- **Primary:** Signal Orange with Paper White text and a full-width 15px by 20px interior.
- **Dark action:** Near-Black Ink with Paper White text for the final Save PNG action.
- **Secondary:** Warm near-white surfaces with a quiet gray border and dark text.
- **Hover / Focus:** Hover changes tone rather than size. Keyboard focus uses a 3px translucent Signal Orange outline with 2px offset.
- **Disabled:** Preserve layout and reduce opacity to 50 percent.

### Chips

- **Format badges:** Badge Surface with Badge Ink, a 1px neutral border, 5px corners, 23px height, and enough horizontal padding for full card codes.
- **Status and quantity:** Use pill geometry for compact state or count information.
- **Selected segment:** Use a clean white inset tile with a shallow shadow inside the shared segmented-control track.

### Cards / Containers

- **Wanted board:** Deep Forest, a 1px dark border, 5px corners, responsive internal padding, and the structural offset shadow.
- **Card art:** Clipped to 5px to 8px corners with dark neutral frames that disappear visually against the board.
- **Feedback panel:** Warm error paper, a muted terracotta border, and dark brown text so the warning is clear without becoming alarming.
- **Text output:** Translucent paper, a neutral border, 10px corners, and progressive disclosure.

### Inputs / Fields

- **Style:** Paper White field, 1px neutral border, 12px corners, monospace input, and 18px internal padding.
- **Focus:** Signal Orange border plus a restrained translucent ring.
- **Behavior:** The textarea remains vertically resizable and maintains a generous minimum height for pasted lists.

### Navigation

The topbar is a thin warm-paper strip with a bottom divider. The compact rotated RL mark provides the only decorative motion in the brand lockup. The catalog status stays on the opposite edge as a quiet pill with a small state dot.

### Wanted Board

The wanted board is the signature component and the visual bridge between the application and exported PNG. It pairs the WANTED serif headline, card artwork, quantity pills, compact uppercase metadata, and a restrained footer. Grid, list, and compact modes change information density without changing the board's identity.

## Do's and Don'ts

### Do:

- **Do** let card artwork provide most of the saturated color.
- **Do** keep Signal Orange rare and action-oriented.
- **Do** preserve the warm-paper and deep-board contrast across web and exported images.
- **Do** maintain the mobile paste-to-share sequence and full-width phone actions.
- **Do** use borders and tonal changes before adding new shadows.

### Don't:

- **Don't** turn RiftList into a glossy esports dashboard with neon glows, glass panels, or game-HUD chrome.
- **Don't** use ornate fantasy frames, decorative runes, or lore-heavy interface ornament.
- **Don't** flatten the product into a generic SaaS dashboard of interchangeable white cards and blue buttons.
- **Don't** apply serif type to operational controls or dense metadata.
- **Don't** introduce large accent-colored surfaces or additional competing accent hues.
