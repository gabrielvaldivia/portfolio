# Dive Club review

`/dive` and its page aliases reuse the public portfolio components and CMS data. The shared `PortfolioLayout` includes the scoped Inflight script in the initial HTML head only when the review layout requests it. Review metadata and the `/dive/:path*` response header both disable indexing. These routes are not CMS pages, so they do not enter the navigation, sitemap, or agent indexes.

Review responses override the site's default `Permissions-Policy` to allow camera and microphone access for `self`. Inflight records in the page's own context, so no cross-origin allowance is needed. Visitors must still grant browser permission. Geolocation, payment, and USB remain disabled, and ordinary portfolio pages continue to block camera and microphone access.

`SiteLink`, `SiteAnchor`, and `ReviewNavigation` keep page links and active navigation within `/dive` while retaining ordinary behavior outside it. External destinations, fragments, API requests, and asset URLs stay unchanged. New public pages linked from the portfolio should have a matching alias under `src/app/(review)/dive`.

Use the usual single push to `master` after local checks. Inflight activates automatically on the public HTTPS review URL; localhost cannot activate a portfolio review. The public `/dive` URL needs no password. Adding reviewer questions in the widget does not submit the portfolio to the live-review queue.

Verification: run `npm test`, `npm run typecheck`, `npm run check:changelog`, and `npm run build`. Check the homepage and a normal case study without a widget, then `/dive` and a review case study with exactly one scoped script in the initial head and `noindex`. Exercise mobile layout, internal and external links, and browser back/forward. Confirm the widget itself after deployment.
