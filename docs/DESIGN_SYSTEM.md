# Design System

## Direction

Aperture Financial Intelligence should feel like a premium AI finance terminal: dark, precise, analytical, and trustworthy. The interface should be dense enough for repeated use without becoming visually noisy.

## Visual Keywords

- dark graphite
- brushed metal
- glass depth
- cool analytical accents
- high-contrast metrics
- restrained motion
- citation-first AI panels
- responsive terminal-like workspace

## Palette Direction

Draft tokens:
- Background: near-black graphite
- Surface: charcoal, slate-black, smoked glass
- Border: cool gray with low opacity
- Text primary: near-white
- Text secondary: zinc/stone gray
- Accent: cyan or teal for intelligence and focus
- Positive: green used sparingly
- Warning: amber used sparingly
- Risk: red used sparingly and paired with text labels

Avoid a one-note purple/blue gradient SaaS palette.

## Typography

- Use a clean sans family for UI.
- Use monospace selectively for tickers, numeric values, timestamps, and request IDs.
- Keep dashboard headings compact.
- Reserve large display type for marketing hero sections only.

## Components

Use shadcn/ui primitives where possible:
- Button
- Card for repeated items only
- Tabs
- Dialog
- Sheet
- Dropdown menu
- Tooltip
- Table
- Badge
- Input
- Select

Avoid nested cards and decorative card-heavy layouts.

## Dashboard Layout Rules

- Stable chart dimensions with responsive constraints.
- Dense but calm metric hierarchy.
- Mobile gets stacked or tabbed workflows, not squeezed desktop grids.
- Risk labels cannot rely on color alone.
- AI citations must be inspectable.
- Data freshness should be visible near AI and market-data surfaces.

## Investment Geography

- Every asset in Portfolio and Markets must appear in the geographic breakdown and remain selectable, even when it has no single country pin.
- Resolve a country from live provider profile metadata first, then an explicit provider country name, ISIN registration, or a reported listing venue mapped to its country. Label the basis. Do not use a hand-maintained company-symbol list or assume a U.S. listing from ticker shape.
- A fund's profile or listing country is its domicile/listing lens, not its underlying country allocation. Show look-through exposure only when a provider supplies actual country weights; the current FMP plan restricts that endpoint.
- Decentralized crypto, currency pairs, commodities, and other genuinely cross-border references belong in a global band, without a fabricated country pin.
- If a provider supplies no defensible country or cross-border classification, show the asset in a separate "Country not supplied" band. This is a mapped data-quality state, never an invented country or a claim of worldwide exposure.
- Country, global, and missing-attribution amounts or counts must reconcile to the full displayed asset set. The globe and table must expose the same classification.

## Marketing Rules

- Build the actual product signal into the first viewport.
- Use licensed stock images/videos only when they reinforce finance research, analyst workflow, market infrastructure, or product context.
- Avoid generic office stock photography.
- Respect reduced-motion preferences.
- Keep media compressed, poster-backed, and non-blocking.

## Brand Assets

Planned assets:
- logo mark
- wordmark
- favicon
- app icon
- Open Graph image
- dark/light-safe variants
- media source/license notes

Generated logo concepts are acceptable for exploration, but final wordmark text must be recreated as production-safe typography/vector assets.
