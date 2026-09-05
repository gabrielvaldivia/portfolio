import configData from '@/data/hero-config.json'

export type HeroConfigSlide = {
  slug: string
  image: string | null
  title?: string | null
  subtitle?: string | null
  gradientColor?: string | null
}

export type HeroConfig = {
  slides: HeroConfigSlide[]
}

export const heroConfig = configData as HeroConfig

export function applyHeroConfig(projects: any[], fallbackProjects: any[]) {
  if (!heroConfig.slides.length) return fallbackProjects

  const projectsBySlug = new Map(
    projects.map((project) => [project.slug, project]),
  )
  const configuredProjects = heroConfig.slides.flatMap((slide) => {
    const project = projectsBySlug.get(slide.slug)
    if (!project) return []

    return [{
      ...project,
      title: slide.title?.trim() || project.title,
      subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : project.subtitle,
      featuredImage: slide.image
        ? {
            url: slide.image,
            alt: project.featuredImage?.alt || `${project.title} hero image`,
          }
        : project.featuredImage,
      heroGradientColor: slide.gradientColor || null,
    }]
  })

  return configuredProjects.length ? configuredProjects : fallbackProjects
}
