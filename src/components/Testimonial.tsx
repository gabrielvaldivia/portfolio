import Image from 'next/image'

type Props = {
  quote: string
  name: string
  company?: string
  companyLogo?: { url: string; alt?: string } | null
  photo?: { url: string; alt: string }
  linkedIn?: string
}

export function Testimonial({ quote, name, company, companyLogo, photo, linkedIn }: Props) {
  const authorBlock = (
    <div className="flex items-center justify-between gap-3">
      <div>
        {companyLogo?.url ? (
          <img src={companyLogo.url} alt={companyLogo.alt || company || ''} className="object-contain opacity-40" style={{ filter: 'brightness(0) invert(1)', height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '150px' }} />
        ) : company ? (
          <p className="text-muted text-caption">{company}</p>
        ) : (
          <p className="text-content font-medium">{name}</p>
        )}
      </div>
      {photo?.url && (
        <div className="relative w-11 h-11 shrink-0 group/avatar">
          <div className="w-full h-full rounded-full overflow-hidden">
            <Image src={photo.url} alt={photo.alt || name} width={44} height={44} className="w-full h-full object-cover" />
            <div className="absolute inset-0 rounded-full border border-border pointer-events-none" />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-content text-inverse text-xs rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">{name}</div>
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-background-alt rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] p-6 tablet:p-8 desktop:p-10 flex flex-col h-full">
      <p className="text-content text-[18px] tablet:text-[22px] desktop:text-[26px] leading-[1.4] flex-1 pb-10" style={{ textIndent: '-0.4em' }}>
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
