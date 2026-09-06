import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { getLinkedImage } from '@/lib/richTextImages'

function resolveUrl(fields: any): string {
  if (!fields) return '#'

  // Has a doc reference — it's an internal link
  if (fields.doc) {
    const doc = fields.doc
    const slug = doc.value?.slug || doc.slug
    const collection = fields.relationTo

    // Projects
    if (collection === 'projects') {
      return `/work/${slug}`
    }

    if (collection === 'notes') {
      return `/notes/${slug}`
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

export function RichText({ data, renderLinkedImages = false }: { data: any; renderLinkedImages?: boolean }) {
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
