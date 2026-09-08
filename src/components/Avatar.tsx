import { PayloadImage } from '@/components/PayloadImage'
import { cn } from '@/lib/cn'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'

type Props = {
  name: string
  photo?: (ResponsiveImageMedia & { url: string }) | null
  photoDark?: (ResponsiveImageMedia & { url: string }) | null
  role?: string
  linkedIn?: string
  size?: number
  showTooltip?: boolean
  eager?: boolean
  className?: string
}

export function Avatar({
  name,
  photo,
  photoDark,
  linkedIn,
  size = 30,
  showTooltip = true,
  eager = false,
  className,
}: Props) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const circle = (
    <div className={cn('relative shrink-0 group/avatar', className)} style={{ width: size, height: size }}>
      <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-background-alt">
        {photo?.url ? (
          <>
            <PayloadImage
              media={photo}
              alt={photo.alt || name}
              fill
              loading={eager ? 'eager' : undefined}
              sizes={`${size}px`}
              className={cn('object-cover', photoDark?.url && 'light-only')}
            />
            {photoDark?.url && (
              <PayloadImage
                media={photoDark}
                alt={photoDark.alt || name}
                fill
                loading={eager ? 'eager' : undefined}
                sizes={`${size}px`}
                className="object-cover dark-only"
              />
            )}
          </>
        ) : (
          <span className="text-text-body text-[10px] font-medium">{initials}</span>
        )}
        <div className="absolute inset-0 rounded-full border border-border pointer-events-none" />
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-content text-inverse text-xs rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
          {name}
        </div>
      )}
    </div>
  )

  if (linkedIn) {
    return <a href={linkedIn} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn`}>{circle}</a>
  }
  return circle
}
