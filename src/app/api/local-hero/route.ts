import path from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import type { HeroConfig, HeroConfigSlide } from '@/lib/heroConfig'

export const runtime = 'nodejs'

const configPath = path.join(process.cwd(), 'src/data/hero-config.json')
const heroImageDirectory = path.join(process.cwd(), 'public/hero')
const maximumImageBytes = 25 * 1024 * 1024

function isOptionalText(value: unknown, maximumLength: number) {
  return value === undefined
    || value === null
    || (typeof value === 'string' && value.length <= maximumLength)
}

function isValidSlide(value: unknown): value is HeroConfigSlide {
  if (!value || typeof value !== 'object') return false
  const slide = value as Partial<HeroConfigSlide>
  return typeof slide.slug === 'string'
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slide.slug)
    && (slide.image === null || typeof slide.image === 'string')
    && isOptionalText(slide.title, 120)
    && isOptionalText(slide.subtitle, 240)
    && (
      slide.gradientColor === undefined
      || slide.gradientColor === null
      || /^#[0-9a-f]{6}$/i.test(slide.gradientColor)
    )
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const submittedSlides = JSON.parse(String(formData.get('slides') || '[]')) as unknown
    if (!Array.isArray(submittedSlides) || !submittedSlides.length || submittedSlides.length > 20 || !submittedSlides.every(isValidSlide)) {
      return NextResponse.json({ error: 'Choose between 1 and 20 valid projects.' }, { status: 400 })
    }

    const uniqueSlugs = new Set(submittedSlides.map((slide) => slide.slug))
    if (uniqueSlugs.size !== submittedSlides.length) {
      return NextResponse.json({ error: 'Each project can only appear once.' }, { status: 400 })
    }

    const currentConfig = JSON.parse(await readFile(configPath, 'utf8')) as HeroConfig
    const currentSlides = new Map(currentConfig.slides.map((slide) => [slide.slug, slide]))
    await mkdir(heroImageDirectory, { recursive: true })

    const slides: HeroConfigSlide[] = []
    for (const submittedSlide of submittedSlides) {
      const upload = formData.get(`image:${submittedSlide.slug}`)
      let image = currentSlides.get(submittedSlide.slug)?.image || submittedSlide.image || null

      if (upload instanceof File && upload.size > 0) {
        if (!upload.type.startsWith('image/') || upload.size > maximumImageBytes) {
          return NextResponse.json({ error: `${submittedSlide.slug}: choose an image under 25 MB.` }, { status: 400 })
        }

        const filename = `${submittedSlide.slug}.webp`
        const finalPath = path.join(heroImageDirectory, filename)
        const temporaryPath = `${finalPath}.tmp`
        await sharp(Buffer.from(await upload.arrayBuffer()))
          .rotate()
          .webp({ quality: 90 })
          .toFile(temporaryPath)
        await rename(temporaryPath, finalPath)
        image = `/hero/${filename}`
      }

      slides.push({
        slug: submittedSlide.slug,
        image,
        title: typeof submittedSlide.title === 'string'
          ? submittedSlide.title.trim() || null
          : null,
        subtitle: typeof submittedSlide.subtitle === 'string'
          ? submittedSlide.subtitle.trim()
          : null,
        gradientColor: typeof submittedSlide.gradientColor === 'string'
          ? submittedSlide.gradientColor.toLowerCase()
          : null,
      })
    }

    const nextConfig: HeroConfig = { slides }
    const temporaryConfigPath = `${configPath}.tmp`
    await writeFile(temporaryConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8')
    await rename(temporaryConfigPath, configPath)
    revalidatePath('/')
    revalidatePath('/studio/hero')

    return NextResponse.json(nextConfig)
  } catch (error) {
    console.error('Local hero save failed.', error)
    return NextResponse.json({ error: 'Could not save the local hero configuration.' }, { status: 500 })
  }
}
