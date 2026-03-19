import Image from 'next/image'

type ImageItem = {
  image: { url: string; alt: string; width: number; height: number }
  border?: boolean
}

type Props = {
  columns?: string
  images?: ImageItem[]
}

export function ImageGridBlock({ columns = '2', images }: Props) {
  if (!images?.length) return null

  const gridClass = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-1 tablet:grid-cols-2',
    '3': 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3',
  }[columns] || 'grid-cols-2'

  return (
    <div className={`grid ${gridClass} gap-10`}>
      {images.map((item, i) => {
        const aspectRatio = item.image.width && item.image.height
          ? item.image.width / item.image.height
          : 4 / 3

        return (
          <div
            key={i}
            className={`bg-background-alt overflow-hidden relative ${item.border ? 'border border-border' : ''}`}
            style={{ aspectRatio }}
          >
            <Image
              src={item.image.url}
              alt={item.image.alt || ''}
              fill
              className="object-cover"
              sizes={columns === '1' ? '100vw' : columns === '2' ? '50vw' : '33vw'}
            />
          </div>
        )
      })}
    </div>
  )
}
