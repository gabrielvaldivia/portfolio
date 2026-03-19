type TimelineItem = {
  year: string
  title: string
  description?: string
}

export function BioTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
      <div className="space-y-8">
        {items.map((item, i) => (
          <div key={i} className="relative pl-8">
            <div className="absolute left-0 top-2 w-[15px] h-[15px] rounded-full border-2 border-accent bg-background" />
            <span className="text-muted text-sm font-mono">{item.year}</span>
            <h4 className="text-content font-medium mt-1">{item.title}</h4>
            {item.description && <p className="text-muted text-sm mt-1">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
