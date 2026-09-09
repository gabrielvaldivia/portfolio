import Link from 'next/link'
import { PayloadImage } from '@/components/PayloadImage'
import { cn } from '@/lib/cn'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'

type Props = {
  title: string
  slug: string
  subtitle?: string
  featuredImage?: ResponsiveImageMedia
  href?: string
  icon?: React.ReactNode
  priority?: boolean
  variant?: 'default' | 'hero'
  tabIndex?: number
  emphasizeHover?: boolean
}

export function ProjectCard({ title, slug, subtitle, featuredImage, href, icon, priority, variant = 'default', tabIndex, emphasizeHover = false }: Props) {
  const isHero = variant === 'hero'

  return (
    <Link
      href={href || `/work/${slug}`}
      tabIndex={tabIndex}
      className={cn(
        'group block tablet:p-2',
        isHero && 'h-full',
        emphasizeHover &&
          'rounded-[20px] transition-transform duration-200 ease-out hover:scale-[1.025] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content motion-reduce:transition-none motion-reduce:hover:scale-100 tablet:rounded-[30px] desktop:rounded-[40px]',
      )}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-[20px] bg-background-alt transition-colors duration-150 ease-out tablet:rounded-[30px] desktop:rounded-[40px]',
          emphasizeHover
            ? 'group-hover:bg-background-alt-strong-hover'
            : 'group-hover:bg-alt-hover',
          isHero && 'h-full',
        )}
      >
        {/* Project image */}
        <div
          className={cn(
            'relative overflow-hidden',
            isHero ? 'min-h-0 flex-1' : 'aspect-square',
          )}
        >
          {icon ? (
            <div className="absolute inset-0 flex items-center justify-center p-16 text-text-strong">
              {icon}
            </div>
          ) : featuredImage?.url ? (
            <PayloadImage
              media={featuredImage}
              alt={featuredImage.alt || title}
              fill
              className={cn(
                'object-cover',
                !emphasizeHover && 'transition-transform duration-500 group-hover:scale-[1.03]',
              )}
              sizes="(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-text-body text-lg">{title}</span>
            </div>
          )}
        </div>
        {/* Title and description */}
        <div className="shrink-0 p-5 tablet:p-7">
          <h4 className="text-text-strong">
            {title}
          </h4>
          {subtitle && <p className="text-text-muted text-caption" style={{ marginTop: '8px' }}>{subtitle}</p>}
        </div>
      </div>
    </Link>
  )
}
