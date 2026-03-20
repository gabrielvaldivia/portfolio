import { getPayload } from 'payload'
import config from '../src/payload.config'

const PUBLIC_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev'

const logoMap: Record<string, string> = {
  'Dex': 'Dex.svg',
  'Gather': 'Gather.svg',
  'Goodword': 'goodword.svg',
  'Google Ventures': 'Google Ventures.svg',
  'Grandstand': 'Grandstand.svg',
  'Kiosk': 'Kiosk.svg',
  'National Design Studio': 'National Design Studio.svg',
  'Profile': 'Profile.svg',
  'Roon': 'roon.svg',
  'Ritual Dental': 'Ritual Dental.svg',
  'Sensible': 'Sensible.svg',
  'Slingshot': 'Slingshot AI.svg',
  'SuperMe': 'SuperMe.svg',
  'Supper': 'Supper.svg',
  'The Majority Group': 'The Majority Group.svg',
  'Workmate': 'workmate.svg',
  'World Playground': 'World Playground.svg',
  'Daylight': 'Daylight.svg',
}

async function main() {
  const payload = await getPayload({ config })

  const { docs: clients } = await payload.find({
    collection: 'clients',
    limit: 100,
  })

  for (const client of clients) {
    const filename = logoMap[client.name]
    if (!filename) {
      console.log(`SKIP: No logo for "${client.name}"`)
      continue
    }

    // Create media record pointing to the R2 file
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: `${client.name} logo`,
        filename: filename,
        mimeType: 'image/svg+xml',
        url: `${PUBLIC_URL}/${encodeURIComponent(filename)}`,
      } as any,
    })

    console.log(`Created media ${media.id} for ${client.name}`)

    // Attach to client
    await payload.update({
      collection: 'clients',
      id: client.id,
      data: {
        logo: media.id,
      },
    })

    console.log(`  Attached to client ${client.id} (${client.name})`)
  }

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
