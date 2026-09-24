import { ServicePill } from '@/components/ServicePill'

export function HeroProjectPills({ pills = [] }: { pills?: string[] }) {
  if (!pills.length) return null

  return (
    <ul aria-label="Capabilities and industries" className="hero-project-pills mt-2 flex min-w-0 flex-wrap gap-2.5 max-tablet:flex-nowrap max-tablet:gap-1.5 max-tablet:overflow-x-auto">
      {pills.map(title => (
        <li key={title} className="shrink-0">
          <ServicePill title={title} size="small" variant="on-media" className="max-tablet:px-2 max-tablet:py-1 max-tablet:text-[11px]" />
        </li>
      ))}
    </ul>
  )
}
