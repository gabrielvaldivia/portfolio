import Image from 'next/image'

type Props = {
  image: { url: string; alt: string; width: number; height: number }
  deviceType?: string
  layout?: string
  additionalImages?: { image: { url: string; alt: string; width: number; height: number } }[]
}

export function DeviceMockupBlock({ image, deviceType = 'phone', layout = 'single', additionalImages }: Props) {
  if (!image?.url) return null

  const allImages = [image, ...(additionalImages?.map((i) => i.image) || [])]

  const deviceStyles: Record<string, string> = {
    phone: 'max-w-[375px] rounded-[40px] border-[8px] border-content/10',
    tablet: 'max-w-[600px] rounded-[24px] border-[6px] border-content/10',
    desktop: 'max-w-full rounded-[12px] border-[4px] border-content/10',
  }

  const style = deviceStyles[deviceType] || deviceStyles.phone

  return (
    <div className="bg-background-alt overflow-hidden py-16 flex justify-center gap-10 flex-wrap">
      {allImages.map((img, i) => {
        const aspectRatio = img.width && img.height ? img.width / img.height : 9 / 19.5
        return (
          <div key={i} className={`${style} overflow-hidden shadow-lg relative`} style={{ aspectRatio }}>
            <Image
              src={img.url}
              alt={img.alt || ''}
              fill
              className="object-cover"
            />
          </div>
        )
      })}
    </div>
  )
}
