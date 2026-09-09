import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import {
  lexicalToMarkdown,
  markdownDocument,
  markdownResponse,
} from '../src/lib/agentMarkdown'
import { buildPageMetadata } from '../src/lib/pageMetadata'
import { buildSiteStructuredData } from '../src/lib/structuredData'

test('builds canonical and Markdown alternate metadata without changing rendered content', () => {
  const metadata = buildPageMetadata(null, {
    fallbackTitle: 'Work',
    fallbackDescription: 'Selected work',
    canonicalPath: '/work',
    markdownPath: '/work/index.md',
  })

  assert.equal(metadata.alternates?.canonical, '/work')
  assert.equal(metadata.alternates?.types?.['text/markdown'], '/work/index.md')
})

test('serializes common Lexical blocks into concise Markdown', () => {
  const markdown = lexicalToMarkdown({
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Outcome' }] },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Read the ' },
            { type: 'link', fields: { url: '/work' }, children: [{ type: 'text', text: 'case study', format: 1 }] },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
  })

  assert.equal(markdown, '## Outcome\n\nRead the [**case study**](/work).')
})

test('structured data uses stable Person and WebSite identifiers', () => {
  const data = buildSiteStructuredData([{
    '@type': 'WebPage',
    url: 'https://example.com/about',
  }], 'https://example.com/')
  const graph = data['@graph']

  assert.equal(graph[0]['@id'], 'https://example.com/#gabriel-valdivia')
  assert.equal(graph[1]['@id'], 'https://example.com/#website')
  assert.equal(graph[2]['@type'], 'WebPage')
})

test('Markdown responses advertise the canonical HTML and llms.txt guide', async () => {
  const response = markdownResponse(markdownDocument('Example', ['Body']), {
    htmlPath: '/example',
  })

  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8')
  assert.match(response.headers.get('link') || '', /rel="alternate"; type="text\/html"/)
  assert.match(response.headers.get('link') || '', /\/llms\.txt>; rel="describedby"/)
  assert.equal(await response.text(), '# Example\n\nBody\n')
})

test('agent-readable routes exist outside the blocked API namespace', () => {
  const routes = [
    'src/app/(agents)/llms.txt/route.ts',
    'src/app/(agents)/about.md/route.ts',
    'src/app/(agents)/work/index.md/route.ts',
    'src/app/(agents)/work/[slug]/index.md/route.ts',
    'src/app/(agents)/notes/index.md/route.ts',
    'src/app/(agents)/notes/[slug]/index.md/route.ts',
  ]

  for (const route of routes) assert.equal(existsSync(route), true, route)
})
