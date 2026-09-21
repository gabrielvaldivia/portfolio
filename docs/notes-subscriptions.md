# Notes subscriptions

The full-content RSS feed is available at `/notes/rss.xml`. Public pages using the main site layout include a titled `application/rss+xml` discovery link in the HTML head, so readers can subscribe from the homepage, Notes index, or an individual post. Readers can also subscribe directly with `https://www.gabrielvaldivia.com/notes/rss.xml`. The feed includes published notes, newest first, with a summary, full article HTML, publication date, and stable permalink for each item.

Readers sign up from the Notes index or at the bottom of any note and confirm their address using the link sent by `/api/notes/subscribe`. The confirmation route saves their subscription and sends an owner notification with the reader’s address, a direct reply-to, and a link to their subscriber record.

Owner notifications use `RESEND_API_KEY` and `NOTES_EMAIL_FROM`. The recipient is `NOTES_SUBSCRIBER_EMAIL_TO`, falling back to `CONTACT_EMAIL_TO` and then `gabe@valdivia.works`. Local notifications include `[Local preview]` in the subject.

Already-confirmed subscribers do not generate another notification when reopening the link. Concurrent confirmations use an identical Resend idempotency key; a later resubscription uses a new key. Notification failures are logged without undoing the subscription. Failed notifications are not queued for later delivery.

Run `node --import tsx --test tests/note-subscription-confirmation.test.ts` to check persistence, notification contents, duplicate confirmations, resubscriptions, and failures. Tests mock the database and email transport, so they neither save subscribers nor send email.
