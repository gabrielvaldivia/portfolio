import Image from 'next/image'
import { RichText } from '@/components/RichText'

type Props = {
  ratio?: string
  leftContent?: any
  leftImage?: { url: string; alt: string; width: number; height: number }
  rightContent?: any
  rightImage?: { url: string; alt: string; width: number; height: number }
}

const ratioClasses: Record<string, [string, string]> = {
  '50-50': ['basis-1/2', 'basis-1/2'],
  '33-67': ['basis-1/3', 'basis-2/3'],
  '67-33': ['basis-2/3', 'basis-1/3'],
}

function ColumnImage({ image }: { image: { url: string; alt: string; width: number; height: number } }) {
  const aspectRatio = image.width && image.height ? image.width / image.height : 4 / 3
  return (
    <div className="bg-background-alt overflow-hidden relative" style={{ aspectRatio }}>
      <Image src={image.url} alt={image.alt || ''} fill className="object-cover" />
    </div>
  )
}

export function TwoColumnBlock({ ratio = '50-50', leftContent, leftImage, rightContent, rightImage }: Props) {
  const [leftClass, rightClass] = ratioClasses[ratio] || ratioClasses['50-50']

  return (
    <div className="flex flex-col tablet:flex-row gap-10">
      <div className={`${leftClass} min-w-0`}>
        {leftContent && <RichText data={leftContent} />}
        {leftImage?.url && <ColumnImage image={leftImage} />}
      </div>
      <div className={`${rightClass} min-w-0`}>
        {rightContent && <RichText data={rightContent} />}
        {rightImage?.url && <ColumnImage image={rightImage} />}
      </div>
    </div>
  )
}
