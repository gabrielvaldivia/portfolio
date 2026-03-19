import { RichText } from '@/components/RichText'

export function SectionHeaderBlock({ title, description }: { title: string; description?: any }) {
  return (
    <div>
      <h3 className="mb-4">{title}</h3>
      {description && (
        <div className="text-muted max-w-3xl">
          <RichText data={description} />
        </div>
      )}
    </div>
  )
}
