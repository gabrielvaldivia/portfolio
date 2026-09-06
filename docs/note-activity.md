# Note activity pill

Public note pages show one viewport-fixed, bottom-centered pill, 24px above the
bottom safe area. It is portaled outside the page transition so transforms do
not make it scroll with the article.

- Likes use the existing module-like target, counters, super likes, and activity events.
- The highlight count is the number of distinct, currently resolvable passages,
  not the number of readers. The popover lists every quote in document order;
  selecting one jumps to its first line. Existing selection/highlight actions remain.
- Views begin at launch. A browser counts once per note per UTC calendar day.
  Only visible, mounted note pages record views, not server renders or prefetches.
  Unavailable counts display a dash, never a fabricated zero.

`GET /api/notes/views?noteId=…` reads the count without incrementing it.
`POST` records a view and returns `{ count }`. Only published notes are accepted.
Responses are private/no-store. Cross-site mutations are rejected. The existing
Postgres rate limiter uses separate `views:` keys (120 requests/hour per browser
and IP); it never stores raw IP addresses. `note_views` stores only the note ID,
the existing salted anonymous browser hash, and UTC date. Its primary key makes
concurrent requests/retries idempotent. Clearing cookies or using another browser
can count as another browser; this is a view metric, not a verified unique-person count.

Apply `20260906_160000_add_note_views` before deploying the new API.
The migration is additive and does not edit notes or their publication dates.
Run `npm run test:views` and `npm run test:highlights` for isolated Postgres tests.
