import Image from 'next/image'

type Props = {
  quote: string
  name: string
  role?: string
  company?: string
  photo?: { url: string; alt: string }
  linkedIn?: string
}

export function Testimonial({ quote, name, role, company, photo, linkedIn }: Props) {
  const authorBlock = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-content font-medium">{name}</p>
        {(role || company) && (
          <p className="text-muted text-caption">{[role, company].filter(Boolean).join(', ')}</p>
        )}
      </div>
      {photo?.url && (
        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
          <Image src={photo.url} alt={photo.alt || name} width={44} height={44} className="w-full h-full object-cover" />
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
