# Brand And Media Notes

## Phase 8 Status

The local Phase 8 brand package is complete enough for a recruiter case-study pass. It uses a production-safe vector/CSS aperture mark, dark-first interface styling, and documented media direction. The homepage also uses an original AI-generated hero image created for this project; no unlicensed stock photo or video is bundled in the repo.

Live marketing media remains a follow-on task because final source selection depends on license approval. Until then, the app relies on product UI imagery, deterministic dashboard previews, and local screenshots.

## Brand System

- Product name: Aperture Financial Intelligence.
- Positioning: AI financial research and portfolio decision-support workspace.
- Visual tone: dark metal, glass edge refraction, dense metrics, restrained green and lime state colors.
- Typography: Outfit for interface/display text and Geist Mono for tickers, prices, quotas, and timestamps.
- Mark: minimalist monoline A/lens motif with a centered research focal point. The app renders the mark in `apps/web/src/components/brand.tsx`.
- Production-safe assets:
  - `apps/web/public/brand/aperture-mark.svg`
  - `apps/web/public/brand/aperture-social-card.svg`
  - `apps/web/public/media/aperture-private-study-hero-v1.png`
  - `apps/web/public/media/aperture-private-study-detail-v1.png`
  - `apps/web/src/app/icon.png`
  - `apps/web/src/app/opengraph-image.png`

## Generated Marketing Media

- `apps/web/public/media/aperture-private-study-hero-v1.png`
  - Source: original AI-generated raster asset created for the Aperture homepage.
  - Direction: blue-hour private study, restrained warm lamp light, quiet left-side copy space, and no visible financial UI, logos, text, people, or trading imagery.
  - Intended use: homepage first-viewport hero background.
- `apps/web/public/media/aperture-private-study-detail-v1.png`
  - Source: original AI-generated raster asset created for the Aperture homepage.
  - Direction: close editorial detail of a leather portfolio folder, brushed-metal pen, and dark tablet under restrained blue-hour and lamp light.
  - Intended use: supporting homepage product-feeling section.

## Media Source Notes

No third-party stock assets are committed. For a public deployment, source and document license terms before adding media files.

Recommended source categories:

| Use | Direction | License requirement |
| --- | --- | --- |
| Homepage supporting media | Analyst workstation, data wall, research desk, or financial infrastructure | Commercial web use, modification allowed, attribution recorded |
| Product page | Real dashboard/device context, not generic office photography | Commercial web use, no identifiable private financial data |
| Security page | Data center, infrastructure, or abstract security operations | Commercial web use, no misleading surveillance imagery |
| Demo video | Local product capture only | Owned recording, no third-party footage required |

Avoid generic smiling office images, luxury lifestyle imagery, trading-floor hype, broker/order-entry visuals, and imagery implying automated trading or guaranteed outcomes.

## Accessibility And Performance Rules

- Keep media optional. Product meaning must remain clear without video autoplay.
- Provide poster images for video.
- Respect reduced-motion preferences.
- Keep first-viewport product signal visible on mobile and desktop.
- Do not use AI-generated raster text as a wordmark.
- Keep screenshots and videos free of real user financial data, PII, raw prompts, secrets, and provider keys.
