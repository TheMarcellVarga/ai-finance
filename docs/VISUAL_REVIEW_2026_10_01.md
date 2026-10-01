# Visual review — October 1, 2026

Phase: active Product Simplification Track, responsive navigation and release polish.
Primary skill: `nextjs-fintech-ui`. Support skill: `impeccable` polish.
Scope: the web product at mobile, tablet, and desktop widths; preserve existing identity, finance behavior, and in-progress changes.

## Findings and fixes

- At 320px, Learn was hidden behind horizontal primary-navigation scrolling. All five destinations now share a five-column mobile layout with 44px-high targets.
- Neither navigation layout indicated the current destination. Shared client navigation now highlights the current page and exposes `aria-current`, including nested learning and market routes.
- Sidebar account controls crowded the brand. Desktop account, settings, and notifications now sit in a footer; the wordmark stays on one line.
- The mobile header scrolled out of view because the atmospheric wrapper created an overflow scroll ancestor. The workspace now uses overflow clipping, preserving sticky navigation.
- Core financial metadata and market labels used very faint zinc 500/600 text. These now use zinc 400 while retaining semantic trend colors.
- The combined Markets toolbar squeezed six controls into the reduced desktop content width. Search now spans a separate row until the wide breakpoint; the table's minimum width follows visible column count and its numeric type is larger.
- Geography counts squeezed four labels into narrow mobile cells. They now use two columns on mobile and four on larger screens.
- Small mobile finance controls risked accidental taps and iOS focus zoom. Workspace buttons and inputs have a 44px minimum height; text fields and selects use 16px text on mobile.
- The homepage product image used full container height, clipping its caption. Its intrinsic aspect ratio now leaves room for the caption.
- Public information rows wasted mobile reading width on decorative numbering. Mobile uses icon and copy columns, while numbering remains on desktop.
- Display headings used unusually tight tracking and line height. Shared heading typography now has more readable spacing.
- The asset picker's country filter clipped its placeholder. The desktop field now has a wider fixed track.

## Verification

- Browser geometry checks at 320, 375, 768, 1024, and 1440px for Plan, populated Portfolio, Overview charts, and Markets: no viewport overflow or out-of-bounds controls; primary navigation does not scroll horizontally.
- Mobile text fields and selects render at 16px; primary-navigation targets are 44px high.
- After scrolling the mobile Learn surface, the header remains at viewport top.
- Visual confirmation of desktop/mobile shared shell, portfolio empty and populated states, Plan, Markets, homepage product caption, and Privacy layout.
- `npm run lint`: passed.
- `npm run build`: passed after clearing stale generated types from the removed preview.
- `npm --prefix apps/web run test:overview-charts`: 3 passed.
- Mechanical design scan: three warnings from mixed conditional class strings and existing neutral surfaces, with no blocking findings. Current navigation uses cyan text on its active cyan surface.

The local Postgres service was unavailable, and no signed-in browser session was present. Owner-scoped components were inspected through a temporary development preview with illustrative layout data; the preview was removed afterward. Live authenticated finance flows, native mobile screens, and backend behavior were not verified by this visual pass. External paid AI calls remained disabled.

## October 2 header correction

The first scrolled screenshot still showed page content through the sticky header's transparent outer padding. The header now has an opaque graphite backdrop, a 12px top/bottom gutter with safe-area support, and side insets matching the page content: 16px on phones, 24px on tablets, and 32px on larger compact layouts. Main content gains additional vertical spacing and a scroll margin for keyboard/anchor arrival.

Verified the header stays at viewport top after scrolling, its backdrop is opaque, header/content insets align at 320, 375, and 768px, and all five navigation links still fit without horizontal scrolling.

A subsequent header check covered initial and scrolled states at 320, 375, 768, and 1024px. Insets matched at each breakpoint, the header stayed at top 0, navigation did not overflow, and initial heading clearance was 28px on phones and 40px on tablets. The 320px layout had insufficient reserve for a signed-in avatar with the full brand subtitle; the compact header now hides only that subtitle below 360px, leaving approximately 147px for account controls and retaining the full wordmark elsewhere. Lint and production build passed after the correction.

Commit scope: the responsive layout, navigation, typography, and contrast fixes are committed separately. Existing mobile-app, digest notification, and investment-globe feature work remains uncommitted; the globe-specific polish noted above accompanies that separate feature work.
