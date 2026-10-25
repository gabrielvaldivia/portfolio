
import { SiteAnchor } from '@/components/SiteLink'
import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { getLinkedImage } from '@/lib/richTextImages'

function resolveUrl(fields: any): string {
  if (!fields) return '#'

  // Has a doc reference — it's an internal link
  if (fields.doc) {
    const doc = fields.doc
    const slug = doc.value?.slug || doc.slug
    // Lexical stores polymorphic links as { relationTo, value } on the doc field.
    const collection = doc.relationTo || fields.relationTo

    // Projects
    if (collection === 'projects') {
      return `/work/${slug}`
    }

    if (collection === 'notes') {
      return `/notes/${slug}`
    }

    if (collection === 'side-projects') return slug ? `/playground/${slug}` : '/playground'
    if (collection === 'photos') return slug ? `/photos/${slug}` : '/photos'

    // Pages
    if (slug && (!collection || collection === 'pages')) {
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

export function RichText({ data, renderLinkedImages = false }: { data: any; renderLinkedImages?: boolean }) {
  if (!data) return null
  return (
    <div className="rich-text">
      <PayloadRichText
        data={data}
        converters={({ defaultConverters }) => ({
          ...defaultConverters,
          // A deleted file leaves its upload node behind with no value; skip it.
          upload: (args) => {
            const value = (args.node as { value?: unknown }).value
            if (!value || typeof value !== 'object' || !(value as { url?: unknown }).url) return null
            const convert = defaultConverters.upload
            return typeof convert === 'function' ? convert(args) : null
          },
          link: ({ node, nodesToJSX }) => {
            const fields = node.fields as any
            const url = resolveUrl(fields)
            const linkedImage = renderLinkedImages ? getLinkedImage(url, node) : null

            if (linkedImage) {
              return (
                <span className="my-10 block overflow-hidden rounded-[16px] bg-background-alt">
                  <Image
                    alt=""
                    className="h-auto w-full"
                    height={linkedImage.height}
                    sizes="(max-width: 809px) calc(100vw - 40px), 760px"
                    src={linkedImage.url}
                    width={linkedImage.width}
                  />
                </span>
              )
            }

            return (
              <SiteAnchor
                href={url}
                target={fields?.newTab ? '_blank' : undefined}
                rel={fields?.newTab ? 'noopener noreferrer' : undefined}
              >
                {nodesToJSX({ nodes: node.children as any[] })}
              </SiteAnchor>
            )
          },
        })}
      />
    </div>
  )
}
