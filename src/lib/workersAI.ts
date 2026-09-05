const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast'
const DEFAULT_TIMEOUT_MS = 20_000

export type WorkersAIToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string | Record<string, unknown>
  }
}

export type WorkersAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: WorkersAIToolCall[]
  tool_call_id?: string
}

export type WorkersAITool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type WorkersAIResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: WorkersAIToolCall[]
    }
  }>
  error?: {
    code?: string | number
    message?: string
  }
}

export class WorkersAIError extends Error {
  status: number
  code?: string | number

  constructor(message: string, status: number, code?: string | number) {
    super(message)
    this.name = 'WorkersAIError'
    this.status = status
    this.code = code
  }
}

function getCloudflareAccountId() {
  const explicit = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  if (explicit) return explicit

  try {
    const endpoint = process.env.R2_ENDPOINT?.trim()
    if (!endpoint) return ''
    return new URL(endpoint).hostname.split('.')[0] || ''
  } catch {
    return ''
  }
}

function getTimeoutMs() {
  const configured = Number(process.env.CLOUDFLARE_AI_TIMEOUT_MS)
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS
  return Math.min(Math.max(Math.trunc(configured), 5_000), 25_000)
}

export function isWorkersAIConfigured() {
  return Boolean(getCloudflareAccountId() && process.env.CLOUDFLARE_AI_API_TOKEN?.trim())
}

export function getWorkersAIModel() {
  const model = process.env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_MODEL
  if (!model.startsWith('@cf/')) {
    throw new Error('CLOUDFLARE_AI_MODEL must be a Cloudflare-hosted @cf model')
  }
  return model
}

export async function createWorkersAICompletion({
  messages,
  tools,
  maxTokens = 1_024,
}: {
  messages: WorkersAIMessage[]
  tools?: WorkersAITool[]
  maxTokens?: number
}) {
  const accountId = getCloudflareAccountId()
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN?.trim()
  if (!accountId || !apiToken) {
    throw new WorkersAIError('Workers AI is not configured', 503, 'not_configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs())

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getWorkersAIModel(),
          messages,
          ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
          max_tokens: Math.min(Math.max(Math.trunc(maxTokens), 1), 1_024),
          temperature: 0.25,
        }),
        cache: 'no-store',
        signal: controller.signal,
      },
    )

    const data = (await response.json().catch(() => ({}))) as WorkersAIResponse
    if (!response.ok) {
      throw new WorkersAIError(
        data.error?.message || `Workers AI request failed with ${response.status}`,
        response.status,
        data.error?.code,
      )
    }

    const message = data.choices?.[0]?.message
    if (!message) throw new WorkersAIError('Workers AI returned no message', 502, 'empty_response')

    return {
      content: typeof message.content === 'string' ? message.content : '',
      toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    }
  } catch (error) {
    if (error instanceof WorkersAIError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WorkersAIError('Workers AI request timed out', 504, 'timeout')
    }
    throw new WorkersAIError('Workers AI request failed', 502, 'request_failed')
  } finally {
    clearTimeout(timeout)
  }
}
