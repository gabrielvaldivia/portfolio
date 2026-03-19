import { generateImportMap } from 'payload/dist/bin/generateImportMap/index.js'
import configPromise from '../src/payload.config.ts'

async function main() {
  const config = await configPromise
  await generateImportMap(config as any)
  console.log('Import map generated successfully')
}

main()
