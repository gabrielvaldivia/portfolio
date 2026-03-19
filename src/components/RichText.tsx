import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'

function resolveUrl(fields: any): string {
  if (!fields) return '#'

  // Has a doc reference — it's an internal link
  if (fields.doc) {
    const doc = fields.doc
    const slug = doc.value?.slug || doc.slug
    const type = doc.value?.type || doc.type
    const collection = fields.relationTo

    // Projects
    if (collection === 'projects') {
      return `/work/${slug}`
    }

    // Pages
    if (slug) {
      if (slug === 'home') return '/'
      return `/${slug}`
    }
  }

  // Custom/external URL
  if (fields.url) {
    return fields.url
  }

  return '#'
}

export function RichText({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="rich-text">
      <PayloadRichText
        data={data}
        converters={({ defaultConverters }) => ({
          ...defaultConverters,
          link: ({ node, nodesToJSX }) => {
            const fields = node.fields as any
            const url = resolveUrl(fields)
            return (
              <a
                href={url}
                target={fields?.newTab ? '_blank' : undefined}
                rel={fields?.newTab ? 'noopener noreferrer' : undefined}
              >
                {nodesToJSX({ nodes: node.children as any[] })}
              </a>
            )
          },
        })}
      />
    </div>
  )
}
