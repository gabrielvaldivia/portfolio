import Image from 'next/image'
import { cn } from '@/lib/cn'

type Props = {
  name: string
  photo?: { url: string; alt?: string } | null
  photoDark?: { url: string; alt?: string } | null
  role?: string
  linkedIn?: string
  size?: number
  showTooltip?: boolean
  className?: string
}

export function Avatar({
  name,
  photo,
  photoDark,
  linkedIn,
  size = 30,
  showTooltip = true,
  className,
}: Props) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const circle = (
    <div className={cn('relative shrink-0 group/avatar', className)} style={{ width: size, height: size }}>
      <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-background-alt">
        {photo?.url ? (
          <>
            <Image
              src={photo.url}
              alt={photo.alt || name}
              fill
              sizes={`${size}px`}
              className={cn('object-cover', photoDark?.url && 'light-only')}
            />
            {photoDark?.url && (
              <Image
                src={photoDark.url}
                alt={photoDark.alt || name}
                fill
                sizes={`${size}px`}
                className="object-cover dark-only"
              />
            )}
          </>
        ) : (
          <span className="text-muted text-[10px] font-medium">{initials}</span>
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
