# Engagement models access

`/engagement-models` requires an email before the server renders the engagement details. `/pricing` redirects to the same gated page. Successful submissions send a Resend notification to `ENGAGEMENT_EMAIL_TO`, falling back to `CONTACT_EMAIL_TO` and then `gabe@valdivia.works`. Replying to the notification addresses the visitor.

The gate displays a single email field with an inline arrow to continue. It does not subscribe visitors to Notes or any mailing list. Email syntax is validated, but ownership is not verified.

## Local use

Run `npm run dev` and open `http://localhost:3000/engagement-models`. The existing `RESEND_API_KEY`, `PAYLOAD_SECRET`, and database connection are used. Local notifications are marked `[Local preview]`. No migration or new service is required.

After submitting, access lasts 24 hours in that browser. Use a private window or clear the `gv_engagement_access` cookie to try the gate again. Resend deduplicates notifications for the same normalized address and UTC date, including retries. Requests from browsers with a valid cookie do not send another email.

`ENGAGEMENT_EMAIL_FROM` defaults to the same Resend onboarding domain as the contact form; set a verified sender if needed. A failed notification keeps the page locked and shows a retry message. The existing durable rate-limit store enforces five submissions per browser/IP per hour and 100 globally per UTC day, separately from the contact form.

The signed, HTTP-only access cookie contains only an expiration and a random ID. The page renders dynamically and has `noindex` metadata; unauthenticated HTML and React server responses contain no engagement details.

## Verification

`node --import tsx --test tests/engagement-access.test.ts` checks token tampering and expiry, request validation, notification payloads, duplicate submissions, rate limits, and failed-send retries. The tests mock storage and Resend, so they do not send emails or write to a database.
