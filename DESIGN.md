---
name: Mind Palace
description: A content-first personal library
colors:
  graphite: "#17181c"
  graphite-surface: "#27292f"
  graphite-ink: "#f1f0ed"
  graphite-muted: "#b0aeb8"
  cool-canvas: "#eff0f3"
  paper: "#ffffff"
  paper-ink: "#27272e"
  paper-muted: "#666773"
  amber: "#f5b95c"
  amber-light: "#efa93a"
  amber-ink: "#1a1206"
  amber-text-light: "#80520d"
  ai-dark: "#9a8cff"
  ai-light: "#5b4bd6"
  privacy-dark: "#5cc6ae"
  privacy-light: "#166f5e"
  journal-dark: "#393343"
  journal-ink-dark: "#f0e5fa"
  journal-light: "#eae4f3"
  journal-ink-light: "#393048"
  quote-dark: "#493d28"
  quote-ink-dark: "#ffedbb"
  quote-light: "#f6e6a5"
  quote-ink-light: "#433817"
  book-dark: "#2d3e35"
  book-ink-dark: "#e5f3e9"
  book-light: "#dceade"
  book-ink-light: "#253d2e"
typography:
  search:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0"
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  card: "8px"
  tool: "8px"
  avatar: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  collection-gap: "20px"
  lg: "24px"
  xl: "32px"
  rail-gap: "40px"
components:
  button-primary:
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.tool}"
    height: "44px"
  thought-card:
    rounded: "{rounded.card}"
    padding: "20px"
  search-button:
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.tool}"
    height: "44px"
    width: "44px"
---

# Design System: Mind Palace

## Overview

**Creative North Star: "Personal Library"**

The approved direction is a content-first personal library, informed by the user's supplied note-library screenshot. Preserve product behavior, but replace the sparse brain-centered homepage with real saved thoughts. The reference supplies layout and contrast ideas, not copied images, fonts, or content.

Operate mode with an editorial content voice. Catalogue macrostructure, narrow navigation rail, broad search area, and a staggered collection of individual thoughts. There is no marketing hero or feature-card grid.

- Home: one library for browsing and search, compact navigation, and an inline capture tile. Search results use the same staggered grid as recently saved thoughts; filters expand inline. The rotatable brain is available in an expandable secondary view, with attribution intact.
- Recall is a library capability, not a separate page or navigation destination. Searches use the existing backend across the collection, not a local search of displayed cards. Applied query/filter labels, clear controls, and pagination stay in the library.
- Ask: conversation and source sidebar separated by a rule. Citations expand inside the conversation on mobile.
- Books: compact rows with real titles, authors, and counts.
- Capture, editing, preview, and privacy: existing focused tools, with the same palette and control rhythm.

## Colors

The dark theme uses neutral graphite instead of navy. The light theme uses a cool pale-gray canvas instead of cream. Distinct content surfaces provide contrast without decorative background effects.

All colors live in `tokens.css`:

| Content | Surface Token | Text Token |
| --- | --- | --- |
| Thought | `--mp-note` | `--mp-note-text` |
| Journal | `--mp-note-journal` | `--mp-note-journal-text` |
| Quote | `--mp-note-quote` | `--mp-note-quote-text` |
| Book excerpt | `--mp-note-book` | `--mp-note-book-text` |

Each content type also has a matching muted-text token. Card color is derived from the saved thought type, never random or inferred from private text.

Amber anchors search, capture, active navigation, and important text. The amber Search memory gradient is retained at the user's request and also used for the corresponding homepage search/capture controls. Violet identifies AI controls; verdigris remains a privacy cue. No gradient text or glowing containers.

## Typography

Instrument Serif, upright and weight 400, carries the wordmark, search label, personal writing, and quotations. Geist carries controls, metadata, and ordinary thought bodies. Geist Mono is reserved for useful metadata elsewhere, not decorative eyebrows.

No italic headings, numbered section ornaments, negative tracking, or viewport-scaled font sizes. Let real note length and type create variety. Titles wrap; navigation and command labels remain on one line.

## Layout

Use the existing 4-point spacing tokens. The navigation is tight, the search area has breathing room, and each thought is an individual repeated item with an 8px radius. No floating card around the whole collection, and no nested cards.

Three content columns on wide desktop, two on smaller desktop/tablet, and one on narrow mobile. The navigation reflows into compact text-and-icon controls on mobile.

The home container is at most 1600px wide, with a 192px rail and 40px gap. At 1199px the rail becomes 180px and the collection uses two columns. Below 768px navigation sits above the library, utility controls become icons on the home header, and the brain disclosure follows the library. Below 560px the collection is one column and the capture tile is 104px tall. Homepage search type becomes 32px on mobile. All spacing is fixed or container-constrained, never viewport-scaled type.

## Elevation & Depth

Thoughts rest flat on distinct surfaces. Hover adds one soft shadow through `--mp-note-elevation`: dark `0 6px 24px rgba(0,0,0,.22)` and light `0 6px 24px rgba(34,34,48,.10)`. No lift, scale, or colored halo accompanies the card shadow. Other focused tools retain the existing themed elevation tokens.

## Shapes

Individual repeated thoughts and tool buttons use 8px corners. The collection itself is unframed. Avatars are circular; existing compact utility controls may remain pills. Do not add another rounded container around page sections.

## Components

Opening a card shows its complete saved thought. Its pen opens the existing editor inline above the library, without a page switch. Tags and book selections filter the same library. The capture tile, rail command, and filtered-results add icon open the same capture form. Previous/Next controls paginate the existing backend results.

Keep content visible without entrance delays. Use quiet hover feedback, clear keyboard focus, and a small pressed state. Preserve reduced-motion and no-WebGL fallbacks. Mount the interactive brain only when its disclosure is open.

The visible search label is paired with a 44px input row and a 44px gradient search control. Pen buttons have a 44px hit area. Manual tags use underlined text, displaying two tags and an overflow count. Type-specific cards use matching foreground and muted tokens; full content remains available through the preview. Loading, error/retry, and empty states are part of the library.

## Do's and Don'ts

- Do derive card color from the actual saved thought type.
- Do use the amber gradient on search and capture, with the contrasting amber-ink token.
- Do keep actual saved content and predictable commands primary.
- Do keep headings upright and letter spacing at zero.
- Don't restore oversized feature cards or a brain-centered marketing hero.
- Don't insert fake notes, decorative stock images, or invented metrics into production.
- Don't change auth, storage, AI consent, or API contracts to support visual styling.
- Don't imply end-to-end encryption; the cloud MVP remains server-readable.

Only actual API-returned thoughts appear in production. Do not insert demonstration notes or decorative stock imagery. Do not change auth, storage, AI consent, or backend contracts for a visual task. The cloud MVP is server-readable; privacy labels must not imply end-to-end encryption.

Generated design screenshots have been removed from the workspace. `scripts/design-preview.mjs` can regenerate synthetic-data previews for inline search, filters, editing, empty results, and pagination when needed. Fixture notes remain in `docs/design-review`; these previews are not authenticated E2E or live backend verification.

Automated testing remains deferred at the user's request. Browser screenshots are visual inspection, not proof of a passing test suite.
