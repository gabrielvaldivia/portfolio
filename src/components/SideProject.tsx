import Image from 'next/image'

type Props = {
  title: string
  description?: string
  image?: { url: string; alt: string; width: number; height: number }
  url?: string
}

export function SideProject({ title, description, image, url }: Props) {
  const Wrapper = url ? 'a' : 'div'
  const wrapperProps = url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Wrapper {...wrapperProps} className="group block bg-elevated rounded-2xl overflow-hidden border border-border hover:border-border-strong transition-colors">
      {image?.url && (
        <div className="aspect-video relative">
          <Image src={image.url} alt={image.alt || title} fill className="object-cover" sizes="(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw" />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-content font-heading font-semibold text-lg group-hover:text-accent transition-colors">{title}</h3>
        {description && <p className="text-muted text-sm mt-2 line-clamp-2">{description}</p>}
      </div>
    </Wrapper>
  )
}
