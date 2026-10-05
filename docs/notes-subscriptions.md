# Notes subscriptions

The full-content RSS feed is available at `/notes/rss.xml`. Public pages using the main site layout include a titled `application/rss+xml` discovery link in the HTML head, so readers can subscribe from the homepage, Notes index, or an individual post. Readers can also subscribe directly with `https://www.gabrielvaldivia.com/notes/rss.xml`. The feed includes published notes, newest first, with a summary, full article HTML, publication date, and stable permalink for each item.

Readers sign up from the Notes index or at the bottom of any note and confirm their address using the link sent by `/api/notes/subscribe`. The Notes index uses a sticky signup sidebar on larger screens and a frosted floating Subscribe pill that expands into a modal containing the signup form and RSS link on smaller screens. It collapses back to the pill when closed and respects reduced-motion preferences. The confirmation route saves their subscription and sends an owner notification with the reader’s address, a direct reply-to, and a link to their subscriber record.

Owner notifications use `RESEND_API_KEY` and `NOTES_EMAIL_FROM`. The recipient is `NOTES_SUBSCRIBER_EMAIL_TO`, falling back to `CONTACT_EMAIL_TO` and then `gabe@valdivia.works`. Local notifications include `[Local preview]` in the subject.

Already-confirmed subscribers do not generate another notification when reopening the link. Concurrent confirmations use an identical Resend idempotency key; a later resubscription uses a new key. Notification failures are logged without undoing the subscription. Failed notifications are not queued for later delivery.

Run `node --import tsx --test tests/note-subscription-confirmation.test.ts` to check persistence, notification contents, duplicate confirmations, resubscriptions, and failures. Tests mock the database and email transport, so they neither save subscribers nor send email.

## Publishing and the daily email queue

First publication (including scheduled publication) creates a durable newsletter and a snapshot of all currently confirmed recipients in the same database transaction as the note. It freezes full email content and each recipient's unsubscribe link. It makes no email-provider calls from the publish request. A queue-storage failure rolls back publication, so publishing again can safely retry. Edits, autosaves, republishes, and notes published before this feature do not create a second mailing.

The production site's `/api/notes/send-newsletters` scheduler checks every five minutes using `CRON_SECRET`, independently of Codex or a user's computer. A shared persistent cache of the next work timestamps lets empty or paused queues skip the database. Publishing, scheduling, and cancellation invalidate this cache after the CMS transaction commits; workers invalidate it after attempting delivery. An hourly cache key forces a fresh read as a fallback for direct SQL/CLI edits, which can otherwise take up to an hour to be noticed. Each active invocation handles up to 25 recipients within a 40-second work budget. A database lease prevents overlapping workers; an atomic shared counter limits new delivery reservations to 100 per UTC calendar day across every queued note. Reservations persist across crashes and deleted notes. Retries of the same recipient reuse the day's reservation. Failed attempts may conservatively consume capacity, so the queue sends **at most** 100 newsletter emails per day. The next invocation after midnight UTC uses the next day's allowance.

Resend's account allowance also counts other outgoing and incoming mail. The queue stops on `daily_quota_exceeded` until the next midnight UTC, or checks again the next day on `monthly_quota_exceeded`. Other site email flows retain their existing behavior; their usage can reduce the number of newsletters the provider accepts. See [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

The worker rechecks subscription status before sending, skips deleted or unsubscribed recipients, and pauses unpublished notes. Production, preview, and local queue entries are separate; the delivery endpoint refuses non-production environments. Queue tables have row-level security enabled and no public policies. Delivery status requires CMS authentication.

In a note's **Metadata → Email delivery**, editors can see sent, waiting, skipped, and attention-needed counts. Status refreshes every 30 seconds while the panel is open. The screen also explains daily allowance waits and provider backoff. `newsletterSentAt` is only recorded when every recipient is sent or skipped, including an empty recipient list.

Every recipient has a stable provider idempotency key and a saved, unchanging message. Network failures retry within [Resend's 24-hour deduplication window](https://resend.com/docs/dashboard/emails/idempotency-keys). If a worker loses the receipt and cannot resolve it within 23 hours, automatic retries stop and CMS status asks for review; it must not blindly resend after the provider forgets the key. Confirm the delivery in Resend before any manual repair.

Deploy the additive `20261002_120000_queue_note_newsletters` migration before releasing the new publication hook. It creates empty queue/runner/quota tables and never queues historical notes. Keep `CRON_SECRET` and `RESEND_API_KEY` configured in production. No Codex automation is involved.

Tests use an isolated PostgreSQL-compatible database and mocked email transport. Run `npm test` for publication transactions, scheduling, recipient snapshots, the shared daily cap, concurrent runs, opt-outs, quota errors, retries, and old uncertain receipts. They do not send real email.
