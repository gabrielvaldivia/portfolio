import Image from 'next/image'
import Link from 'next/link'

type Props = {
  title: string
  slug: string
  subtitle?: string
  featuredImage?: { url: string; alt: string; width: number; height: number }
}

export function IndexCard({ title, slug, subtitle, featuredImage }: Props) {
  return (
    <Link href={`/work/${slug}`} className="group block">
      <div className="rounded-[40px] overflow-hidden bg-background-alt aspect-[3/4] relative mb-4">
        {featuredImage?.url ? (
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt || title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted">{title}</span>
          </div>
        )}
      </div>
      <h5 className="text-content font-medium transition-colors group-hover:text-accent">
        {title}
      </h5>
      {subtitle && <p className="text-muted text-[15px] mt-0.5">{subtitle}</p>}
    </Link>
  )
}
