const baseUrl = (process.argv[2] || 'https://www.gabrielvaldivia.com').replace(/\/$/, '')
const shouldWrite = process.argv.includes('--write')
const homepagePrefix = /^Homepage\s*·\s*/i

async function request(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${options?.method || 'GET'} ${url} failed with HTTP ${response.status}`)
  return response.json()
}

const conversations = []
let page = 1

while (true) {
  const result = await request(`${baseUrl}/api/conversations?depth=0&limit=100&page=${page}`)
  conversations.push(...result.docs)
  if (!result.hasNextPage) break
  page += 1
}

const matches = conversations.filter((conversation) => homepagePrefix.test(conversation.title || ''))
console.log(`Found ${matches.length} Homepage-prefixed conversation${matches.length === 1 ? '' : 's'}.`)

if (!shouldWrite) {
  console.log('Dry run only. Pass --write to update them.')
  process.exit(0)
}

for (const conversation of matches) {
  const title = conversation.title.replace(homepagePrefix, '')
  await request(`${baseUrl}/api/conversations/${conversation.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

console.log(`Updated ${matches.length} conversation${matches.length === 1 ? '' : 's'}.`)
