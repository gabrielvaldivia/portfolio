export function ServicePill({ title, size = 'large' }: { title: string; size?: 'small' | 'large' }) {
  if (size === 'small') {
    return (
      <span className="inline-block px-4 py-2 rounded-full font-mono text-[13px] uppercase tracking-[-0.03em] text-content border border-border-strong whitespace-nowrap">
        {title}
      </span>
    )
  }

  return (
    <span className="inline-block px-5 py-2.5 tablet:px-6 tablet:py-3 desktop:px-10 desktop:py-5 rounded-full text-[18px] tablet:text-[24px] desktop:text-[36px] tracking-[-0.03em] font-heading text-muted border border-border-strong whitespace-nowrap">
      {title}
    </span>
  )
}
