import { RichText } from '@/components/RichText'

export function AboutBio({ data }: { data: any }) {
  return (
    <div className="text-pretty text-body-large">
      <RichText data={data} />
    </div>
  )
}
