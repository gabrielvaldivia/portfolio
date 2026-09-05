import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/cn'

type Props = {
  quote: string
  name: string
  company?: string
  companyLogo?: { url: string; alt?: string } | null
  photo?: { url: string; alt?: string }
  linkedIn?: string
  variant?: 'default' | 'hero'
}

export function Testimonial({ quote, name, company, companyLogo, photo, linkedIn, variant = 'default' }: Props) {
  const isHero = variant === 'hero'
  const authorBlock = isHero ? (
    <p className="text-caption font-medium text-muted">{name}</p>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <div>
        {companyLogo?.url ? (
          <img src={companyLogo.url} alt={companyLogo.alt || company || ''} className="object-contain opacity-40" style={{ filter: 'var(--logo-filter)', height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '150px' }} />
        ) : company ? (
          <p className="text-muted text-caption">{company}</p>
        ) : (
          <p className="text-content font-medium">{name}</p>
        )}
      </div>
      {photo?.url && (
        <Avatar name={name} photo={photo} size={44} />
      )}
    </div>
  )

  return (
    <div
      className={cn(
        isHero
          ? 'flex flex-col gap-4'
          : 'flex h-full flex-col rounded-[20px] bg-background-alt p-6 tablet:rounded-[30px] tablet:p-8 desktop:rounded-[40px] desktop:p-10',
      )}
    >
      <p
        className={cn(
          'text-content leading-[1.4]',
          isHero
            ? 'text-balance text-[16px] tablet:text-[18px] desktop:text-[20px]'
            : 'flex-1 pb-10 text-[18px] tablet:text-[22px] desktop:text-[26px]',
        )}
        style={{ textIndent: '-0.4em' }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      {linkedIn ? (
        <a href={linkedIn} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
          {authorBlock}
        </a>
      ) : (
        authorBlock
      )}
    </div>
  )
}
