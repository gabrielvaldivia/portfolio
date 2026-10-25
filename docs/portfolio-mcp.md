# Portfolio MCP

The Payload MCP endpoint is available at `/api/mcp`. It uses Payload-managed bearer API keys, so access can be revoked and each client key can have its own collection and tool permissions.

## Create a connection key

1. Sign in to the Payload admin after the MCP-enabled deployment is running.
2. Open the account menu at the bottom of the sidebar, choose **MCP keys** (or go to `/admin/collections/payload-mcp-api-keys`), and create a key with a recognizable label.
3. Allow MCP traffic and grant only the capabilities this client needs. Enable collection read/create/update/delete permissions for the portfolio content you want it to manage, plus the custom note and media tools as needed.
4. Copy the generated key when it is shown. Store it as a secret in the MCP client; it cannot be retrieved later.

Do not enable access for user accounts, private conversations, subscriber records, or Payload's internal collections. Those collections are not registered with the portfolio MCP plugin.

## Connect an MCP client

Use the remote Streamable HTTP endpoint and send the key as a bearer token:

```json
{
  "mcpServers": {
    "portfolio": {
      "type": "http",
      "url": "https://www.gabrielvaldivia.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

For local development, use `http://localhost:3000/api/mcp` instead.

## Note and media workflow

- Use `createNoteDraft` and `updateNoteDraft` to edit private note drafts. Their data argument is a JSON object string containing note fields.
- Use `scheduleNote` with a future ISO date and time, or `publishNote` for immediate publication. First publication can queue the note newsletter.
- Use `uploadPortfolioAsset` for images, SVGs, and videos in Media, or images in Photos. The tool accepts base64 content up to 3 MiB. Attach the returned media ID to content fields that reference uploads.
- Standard collection delete tools are available for pages, projects, side projects, clients, people, and services. They are off for notes, photos, and media because the delete tool accepts a filter that can match a whole collection. MCP API keys cannot use the REST API to change content or users; only signed-in CMS users can.

## Database migration

The plugin adds a Payload collection for MCP API keys. Generate and commit its migration with the normal Payload migration workflow, then apply migrations in each environment before creating keys.
