import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { ChatStreamError, streamChat } from '../src/lib/chatStream'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

function respondWith(chunks: string[], delayMs: number) {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const queue = [...chunks]
    return new Response(new ReadableStream({
      async pull(controller) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (init?.signal?.aborted) return controller.error(new DOMException('Aborted', 'AbortError'))
        const chunk = queue.shift()
        if (chunk === undefined) return controller.close()
        controller.enqueue(new TextEncoder().encode(chunk))
      },
    }))
  }) as typeof fetch
}

test('long answers keep streaming while chunks keep arriving', async () => {
  respondWith(['data: {"text":"a"}\n', 'data: {"text":"b"}\n', 'data: {"text":"c"}\n', 'data: [DONE]\n'], 20)
  const seen: string[] = []
  const answer = await streamChat([{ role: 'user', content: 'hi' }], {
    signal: new AbortController().signal, idleTimeoutMs: 50, onText: (text) => seen.push(text),
  })
  assert.equal(answer, 'abc')
  assert.deepEqual(seen, ['a', 'ab', 'abc'])
})

test('an aborted request stops before reporting more text', async () => {
  respondWith(['data: {"text":"a"}\n', 'data: {"text":"b"}\n'], 20)
  const controller = new AbortController()
  const seen: string[] = []
  const pending = streamChat([{ role: 'user', content: 'hi' }], {
    signal: controller.signal, onText: (text) => { seen.push(text); controller.abort() },
  })
  await assert.rejects(pending)
  assert.deepEqual(seen, ['a'])
})

test('rate-limited requests report their status', async () => {
  globalThis.fetch = (async () => new Response('{}', { status: 429 })) as typeof fetch
  await assert.rejects(
    streamChat([{ role: 'user', content: 'hi' }], { signal: new AbortController().signal }),
    (error) => error instanceof ChatStreamError && error.status === 429,
  )
})

test('a stalled stream times out', async () => {
  respondWith(['data: {"text":"a"}\n', 'data: {"text":"b"}\n'], 80)
  await assert.rejects(streamChat([{ role: 'user', content: 'hi' }], {
    signal: new AbortController().signal, idleTimeoutMs: 40,
  }))
})
