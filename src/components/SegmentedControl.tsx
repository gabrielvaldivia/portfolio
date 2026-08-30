import Link from 'next/link'
import { cn } from '@/lib/cn'

export type SegmentedControlItem = {
  href: string
  label: string
  selected: boolean
  scroll?: boolean
}

export function SegmentedControl({
  ariaLabel,
  className,
  items,
}: {
  ariaLabel: string
  className?: string
  items: SegmentedControlItem[]
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn('flex h-10 items-center rounded-full bg-floating p-1 backdrop-blur-xl', className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={item.scroll}
          aria-current={item.selected ? 'page' : undefined}
          className={cn(
            'flex h-8 items-center rounded-full px-4 text-[13px] transition-colors',
            item.selected ? 'bg-background text-content' : 'text-muted hover:text-content',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
