import Anthropic from '@anthropic-ai/sdk'
import { buildContext } from '@/lib/buildContext'

let GABOS_API = process.env.GABOS_API_URL || 'https://gabos.vercel.app'

const tools: Anthropic.Tool[] = [
  {
    name: 'search_writing',
    description:
      "Search Gabriel's blog posts and tweets by keyword. Returns titles and snippets of matching posts. Use this when the user asks about topics Gabriel has written about, his opinions, blog posts, or tweets.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords (e.g. "design leadership", "AI workflows", "startups")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_post',
    description:
      "Read the full content of a specific blog post or tweet thread. Use this after search_writing to get the full text of a relevant post.",
    input_schema: {
      type: 'object' as const,
      properties: {
        slug: {
          type: 'string',
          description: 'The slug/filename of the post (e.g. "2025-02-28-the-startup-design-paradox")',
        },
        dir: {
          type: 'string',
          enum: ['blog', 'twitter'],
          description: 'Which folder to read from',
        },
      },
      required: ['slug', 'dir'],
    },
  },
]

async function searchWriting(query: string): Promise<string> {
  try {
    const res = await fetch(`${GABOS_API}/api/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return 'Search unavailable'
    const results = await res.json()
    if (results.length === 0) return 'No matching posts found.'
    return results
      .map((r: any) => `[${r.dir}/${r.slug}] ${r.title}\n${r.snippet || ''}`)
      .join('\n\n')
  } catch {
    return 'Search unavailable'
  }
}

async function readPost(slug: string, dir: string): Promise<string> {
  try {
    const res = await fetch(`${GABOS_API}/api/post?slug=${encodeURIComponent(slug)}&dir=${encodeURIComponent(dir)}`)
    if (!res.ok) return 'Post not found'
    const data = await res.json()
    return data.content
  } catch {
    return 'Post unavailable'
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages required' }, { status: 400 })
  }

  const { systemPrompt, apiKey, model, gabosApiUrl } = await buildContext()
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return Response.json({ error: 'No API key configured' }, { status: 500 })
  }
  if (gabosApiUrl) GABOS_API = gabosApiUrl

  const anthropic = new Anthropic({ apiKey: key })
  const modelId = model || 'claude-haiku-4-5-20251001'

  // Agentic loop: let Claude use tools, then stream the final response
  let currentMessages: Anthropic.MessageParam[] = messages.map((m: any) => ({
    role: m.role,
    content: m.content,
  }))

  // Tool-use loop (non-streaming, max 3 rounds)
  for (let i = 0; i < 3; i++) {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    })

    if (response.stop_reason !== 'tool_use') {
      // No tool calls — stream the final text response
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      let result: string
      const input = toolUse.input as any
      if (toolUse.name === 'search_writing') {
        result = await searchWriting(input.query)
      } else if (toolUse.name === 'read_post') {
        result = await readPost(input.slug, input.dir)
      } else {
        result = 'Unknown tool'
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ]
  }

  // Fallback: try once more without tools
  const fallbackResponse = await anthropic.messages.create({
    model: modelId,
    max_tokens: 1024,
    system: systemPrompt,
    messages: currentMessages,
  })

  const fallbackText = fallbackResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackText || "Feel free to email me at gabe@valdivia.works and I'll get back to you." })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function GET(req: Request) {
  const { faqItems, apiKey } = await buildContext()
  const city = req.headers.get('x-vercel-ip-city') || ''
  const country = req.headers.get('x-vercel-ip-country') || ''
  const location = city ? `${decodeURIComponent(city)}${country ? `, ${country}` : ''}` : ''

  // Generate 4 random suggested questions
  let suggestions: string[] = []
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      const anthropic = new Anthropic({ apiKey: key })
      const faqContext = faqItems.map((f) => f.question).join(', ')
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You're a startup founder considering hiring a fractional design partner. Generate exactly 4 short questions (under 8 words each) you'd ask before deciding to work together. Think like a busy founder evaluating fit: questions about experience, how engagements work, past clients, background, opinions on design, what they've built, etc. Be specific and practical, not generic. Avoid questions about metrics, ROI, or measurable results. Don't repeat these: ${faqContext}. Return ONLY the 4 questions separated by | with no other text.`,
        }],
      })
      const text = res.content[0].type === 'text' ? res.content[0].text : ''
      suggestions = text.split('|').map((q) => q.trim()).filter(Boolean).slice(0, 4)
    } catch {}
  }

  return Response.json({ faqItems, location, suggestions })
}
