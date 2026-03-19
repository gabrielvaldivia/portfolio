import Image from 'next/image'

type Props = {
  image: { url: string; alt: string; width: number; height: number }
  border?: boolean
}

export function FullWidthImageBlock({ image, border }: Props) {
  if (!image?.url) return null

  // Calculate natural aspect ratio from image dimensions
  const aspectRatio = image.width && image.height ? image.width / image.height : 16 / 9

  return (
    <div
      className={`bg-background-alt overflow-hidden relative ${border ? 'border border-border' : ''}`}
      style={{ aspectRatio }}
    >
      <Image
        src={image.url}
        alt={image.alt || ''}
        fill
        className="object-cover"
        sizes="(max-width: 1560px) 100vw, 1560px"
      />
    </div>
  )
}
