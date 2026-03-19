import { RichText } from '@/components/RichText'

type Props = {
  content: any
  width?: string
}

export function TextBlockBlock({ content, width = 'full' }: Props) {
  if (!content) return null
  return (
    <div className={`${width === 'narrow' ? 'max-w-2xl mx-auto' : ''}`}>
      <RichText data={content} />
    </div>
  )
}
