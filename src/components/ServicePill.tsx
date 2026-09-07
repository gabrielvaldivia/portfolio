import { cn } from '@/lib/cn'

export function ServicePill({ title, size = 'large', variant = 'default' }: {
  title: string
  size?: 'small' | 'large'
  variant?: 'default' | 'on-media'
}) {
  if (size === 'small') {
    return (
      <span className={cn(
        'inline-block px-4 py-2 rounded-full font-mono text-[13px] tablet:text-[14px] uppercase tracking-[-0.03em] border whitespace-nowrap',
        variant === 'on-media' ? 'text-text-on-media-strong border-text-on-media-subtle' : 'text-text-strong border-border-strong',
      )}>
        {title}
      </span>
    )
  }

  return (
    <span className={cn(
      'inline-block px-5 py-2.5 tablet:px-6 tablet:py-3 desktop:px-10 desktop:py-5 rounded-full text-body-xl tracking-[-0.03em] font-heading border whitespace-nowrap',
      variant === 'on-media' ? 'text-text-on-media-strong border-text-on-media-subtle' : 'text-text-body border-border-strong',
    )}>
      {title}
    </span>
  )
}
