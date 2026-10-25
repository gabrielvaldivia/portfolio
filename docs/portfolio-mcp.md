# Portfolio MCP

The portfolio MCP server is at `https://www.gabrielvaldivia.com/api/mcp` (Streamable HTTP). It is built on `@payloadcms/plugin-mcp` and signs clients in with OAuth, so there are no keys to create or paste.

## Connect a client

Add the URL as a remote MCP server. In Claude Code:

```bash
claude mcp add --transport http portfolio https://www.gabrielvaldivia.com/api/mcp
```

In claude.ai or Claude Desktop, add it as a custom connector with the same URL.

The first time the client connects, it opens a browser. Sign in to the Payload admin if asked, check the app name and return address on the consent screen, and choose **Allow**. The client then acts as your CMS account.

For local development, use `http://localhost:3000/api/mcp`.

## How sign-in works

`src/lib/mcpOAuth.ts` implements the OAuth flow the MCP authorization spec describes:

- `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` let clients discover the sign-in. A 401 from `/api/mcp` points to them in its `WWW-Authenticate` header.
- `/oauth/register` registers clients automatically. Client IDs are signed, so no database table is needed.
- `/oauth/authorize` requires a Payload admin session and shows an Allow/Deny screen. PKCE (S256) is required, and only https or loopback redirect addresses are accepted.
- `/oauth/token` exchanges each authorization code once, and issues one-hour access tokens and 30-day refresh tokens.

To sign every MCP client out, change your admin password; tokens carry a fingerprint of it. Rotating `PAYLOAD_SECRET` revokes every token and client registration.

## What clients can do

Clients get every tool the plugin config in `src/payload.config.ts` exposes, limited by your CMS account's own access:

- Find, create, update, and delete pages, projects, side projects, clients, people, and services.
- Find notes, photos, and media, and update photos and media. Delete is off for these because the plugin's delete tool accepts a filter that can match a whole collection.
- Read and update site settings and the timeline.
- `createNoteDraft` and `updateNoteDraft` edit private drafts. Their data argument is a JSON object string of note fields.
- `scheduleNote` takes a future ISO date and time; `publishNote` publishes immediately. A first publication can queue the note newsletter.
- `uploadPortfolioAsset` adds images, SVGs, and videos to Media, or images to Photos, as base64 up to 3 MiB. Link the returned ID in content.

User accounts, conversations, and subscribers are not exposed.

## Unused API keys

The plugin also creates an API key collection (`payload-mcp-api-keys`, migration `20261025_163021`). It is hidden in the admin and not used for sign-in.
