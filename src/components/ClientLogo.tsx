import Image from 'next/image'

type Props = {
  name: string
  logo?: { url: string; alt: string }
  website?: string
}

export function ClientLogo({ name, logo, website }: Props) {
  const content = (
    <div className="flex items-center justify-center p-6 rounded-xl bg-elevated border border-border aspect-[3/2] hover:border-border-strong transition-colors">
      {logo?.url ? (
        <Image src={logo.url} alt={logo.alt || name} width={120} height={60} className="max-h-12 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity dark-invert" />
      ) : (
        <span className="text-muted font-medium">{name}</span>
      )}
    </div>
  )

  if (website) {
    return <a href={website} target="_blank" rel="noopener noreferrer">{content}</a>
  }
  return content
}
