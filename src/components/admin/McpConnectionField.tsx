'use client'

import { CopyToClipboard } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import './McpConnectionField.scss'

/** Shows editors how to connect an AI client to the portfolio's MCP server. */
export function McpConnectionField() {
  const [origin, setOrigin] = useState('https://www.gabrielvaldivia.com')
  useEffect(() => setOrigin(window.location.origin), [])
  const url = `${origin}/api/mcp`
  const command = `claude mcp add --transport http portfolio ${url}`

  return (
    <section className="mcp-connection" aria-labelledby="mcp-connection-title">
      <h3 id="mcp-connection-title" className="mcp-connection__title">AI clients (MCP)</h3>
      <p className="mcp-connection__help">
        Connect Claude or another MCP client to read and edit portfolio content as you. The first time it connects,
        a browser opens; sign in and choose Allow. No API key is needed.
      </p>

      <div className="mcp-connection__item">
        <span className="mcp-connection__label">Server URL</span>
        <div className="mcp-connection__value">
          <code>{url}</code>
          <CopyToClipboard value={url} />
        </div>
        <span className="mcp-connection__hint">In claude.ai or Claude Desktop, add it as a custom connector.</span>
      </div>

      <div className="mcp-connection__item">
        <span className="mcp-connection__label">Claude Code</span>
        <div className="mcp-connection__value">
          <code>{command}</code>
          <CopyToClipboard value={command} />
        </div>
      </div>

      <p className="mcp-connection__hint">
        Connected clients stay signed in for up to 30 days. Change your password to disconnect all of them.
      </p>
    </section>
  )
}
