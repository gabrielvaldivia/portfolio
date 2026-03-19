import Image from 'next/image'
import Link from 'next/link'

type Props = {
  title: string
  slug: string
  subtitle?: string
  featuredImage?: { url: string; alt: string; width: number; height: number }
  year?: string
}

export function ProjectCard({ title, slug, subtitle, featuredImage, year }: Props) {
  return (
    <Link href={`/work/${slug}`} className="group block p-2">
      <div className="rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] overflow-hidden bg-background-alt flex flex-col">
        {/* Square image area */}
        <div className="aspect-square rounded-[14px] tablet:rounded-[26px] desktop:rounded-[32px] overflow-hidden m-1.5 tablet:m-2 relative">
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
              <span className="text-muted text-lg">{title}</span>
            </div>
          )}
        </div>
        {/* Title and description */}
        <div className="p-5 tablet:p-7">
          <h4 className="text-content">
            {title}
          </h4>
          {subtitle && <p className="text-muted text-[12px] tablet:text-[14px] desktop:text-[16px] mt-2">{subtitle}</p>}
        </div>
      </div>
    </Link>
  )
}
