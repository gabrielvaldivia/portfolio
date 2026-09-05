import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'

type Props = {
  title: string
  slug: string
  subtitle?: string
  featuredImage?: { url: string; alt: string; width: number; height: number }
  href?: string
  icon?: React.ReactNode
  priority?: boolean
  variant?: 'default' | 'hero'
  tabIndex?: number
}

export function ProjectCard({ title, slug, subtitle, featuredImage, href, icon, priority, variant = 'default', tabIndex }: Props) {
  const isHero = variant === 'hero'

  return (
    <Link
      href={href || `/work/${slug}`}
      tabIndex={tabIndex}
      className={cn('group block tablet:p-2', isHero && 'h-full')}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-[20px] bg-background-alt transition-colors group-hover:bg-alt-hover tablet:rounded-[30px] desktop:rounded-[40px]',
          isHero && 'h-full',
        )}
      >
        {/* Project image */}
        <div
          className={cn(
            'relative m-1.5 overflow-hidden rounded-[14px] tablet:m-2 tablet:rounded-[26px] desktop:rounded-[32px]',
            isHero ? 'min-h-0 flex-1' : 'aspect-square',
          )}
        >
          {icon ? (
            <div className="absolute inset-0 flex items-center justify-center p-16 text-content">
              {icon}
            </div>
          ) : featuredImage?.url ? (
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw"
              quality={90}
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted text-lg">{title}</span>
            </div>
          )}
        </div>
        {/* Title and description */}
        <div className="shrink-0 p-5 tablet:p-7">
          <h4 className="text-content">
            {title}
          </h4>
          {subtitle && <p className="text-muted text-caption" style={{ marginTop: '8px' }}>{subtitle}</p>}
        </div>
      </div>
    </Link>
  )
}
