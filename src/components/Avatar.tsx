import Image from 'next/image'

type Props = {
  name: string
  photo?: { url: string; alt: string }
  role?: string
  linkedIn?: string
}

export function Avatar({ name, photo, linkedIn }: Props) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const circle = (
    <div className="relative group">
      <div className="relative w-[30px] h-[30px] rounded-full overflow-hidden bg-background-alt shrink-0 flex items-center justify-center">
        {photo?.url ? (
          <Image src={photo.url} alt={photo.alt || name} width={30} height={30} className="w-full h-full object-cover" />
        ) : (
          <span className="text-muted text-[10px] font-medium">{initials}</span>
        )}
        <div className="absolute inset-0 rounded-full border border-border pointer-events-none" />
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-content text-inverse text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {name}
      </div>
    </div>
  )

  if (linkedIn) {
    return <a href={linkedIn} target="_blank" rel="noopener noreferrer">{circle}</a>
  }
  return circle
}
