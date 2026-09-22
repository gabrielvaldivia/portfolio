# Working together access

`/working-together` requires an email before the server renders the engagement details. `/engagement-models` permanently redirects to `/working-together`, and `/pricing` redirects to the same gated page. Successful submissions save the address and notification in a private database queue, then open the page immediately. A scheduled worker sends the Resend notification to `ENGAGEMENT_EMAIL_TO`, falling back to `CONTACT_EMAIL_TO` and then `gabe@valdivia.works`. Replying to the notification addresses the visitor.

The gate displays a single email field with an inline arrow to continue. It does not subscribe visitors to Notes or any mailing list. Email syntax is validated, but ownership is not verified.

## Local use

Apply `20260922_223000_queue_engagement_notifications` before deploying this change. Run `npm run dev` and open `http://localhost:3000/working-together`. The existing `RESEND_API_KEY`, `PAYLOAD_SECRET`, database connection, and `CRON_SECRET` are used. Local notifications are marked `[Local preview]` and cannot be picked up by the production worker.

After submitting, access lasts 24 hours in that browser. Use a private window or clear the `gv_engagement_access` cookie to try the gate again. The queue deduplicates notifications for the same normalized address and UTC date and preserves the original message and provider idempotency key for retries. Requests from browsers with a valid cookie do not queue another email.

`ENGAGEMENT_EMAIL_FROM` defaults to the same Resend onboarding domain as the contact form; set a verified sender if needed. Provider outages, missing email configuration, or exhausted quotas do not block saved submissions. A database failure keeps the page locked so addresses are never silently lost. The existing durable rate-limit store enforces five submissions per browser/IP per hour and 100 globally per UTC day, separately from the contact form.

`/api/engagement-models/notifications` runs once per minute and requires the scheduler's bearer secret. It claims one pending message with a five-minute lease, marks accepted messages as sent, and delays failed sends for an hour. Exhausted quotas also defer other due messages. Stored email data is not exposed through a public CMS collection or route; the queue table has row-level security enabled without public policies.

The signed, HTTP-only access cookie contains only an expiration and a random ID. The page renders dynamically and has `noindex` metadata; unauthenticated HTML and React server responses contain no engagement details.

## Verification

`node --import tsx --test tests/engagement-access.test.ts tests/engagement-notification-queue.test.ts` checks token tampering and expiry, request validation, durable email capture, quota failures, duplicate and concurrent submissions, rate limits, scheduler authentication, and delayed-send recovery. Queue tests execute the migration and SQL against an isolated PGlite database. All provider calls are mocked; no real emails are sent.
