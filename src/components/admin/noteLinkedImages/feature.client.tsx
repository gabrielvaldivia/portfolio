'use client'

import { createClientFeature, LinkNode } from '@payloadcms/richtext-lexical/client'
import type { EditorConfig } from '@payloadcms/richtext-lexical/lexical'

const linkedImageHosts = new Set(['cdn-images-1.medium.com', 'substackcdn.com'])
const linkedImageClass = 'notes-editor-linked-image'

function getLinkedImageURL(url?: string | null) {
  if (!url) return null

  try {
    const parsedURL = new URL(url)
    if (parsedURL.protocol !== 'https:' || !linkedImageHosts.has(parsedURL.hostname)) return null
    return parsedURL.toString()
  } catch {
    return null
  }
}

function renderLinkedImage(anchor: HTMLAnchorElement, url?: string | null) {
  const imageURL = getLinkedImageURL(url)

  if (!imageURL) {
    anchor.classList.remove(linkedImageClass, `${linkedImageClass}--loaded`)
    if (anchor.dataset.noteLinkedImageSource) {
      anchor.removeAttribute('aria-label')
      delete anchor.dataset.noteLinkedImageSource
    }
    anchor.style.removeProperty('aspect-ratio')
    anchor.style.removeProperty('background-image')
    return
  }

  if (anchor.dataset.noteLinkedImageSource === imageURL) return

  anchor.classList.add(linkedImageClass)
  anchor.classList.remove(`${linkedImageClass}--loaded`)
  anchor.dataset.noteLinkedImageSource = imageURL
  anchor.setAttribute('aria-label', 'View full-size image')
  anchor.style.aspectRatio = '4 / 3'
  anchor.style.backgroundImage = `url(${JSON.stringify(imageURL)})`

  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    if (anchor.dataset.noteLinkedImageSource !== imageURL) return
    if (image.naturalWidth && image.naturalHeight) {
      anchor.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`
    }
    anchor.classList.add(`${linkedImageClass}--loaded`)
  }
  image.onerror = () => {
    if (anchor.dataset.noteLinkedImageSource !== imageURL) return
    anchor.classList.remove(`${linkedImageClass}--loaded`)
    anchor.style.removeProperty('aspect-ratio')
    anchor.style.removeProperty('background-image')
  }
  image.src = imageURL
}

class NoteLinkedImageLinkNode extends LinkNode {
  static clone(node: NoteLinkedImageLinkNode) {
    return new NoteLinkedImageLinkNode({
      fields: node.getFields(),
      id: node.getID(),
      key: node.getKey(),
    })
  }

  createDOM(config: EditorConfig) {
    const anchor = super.createDOM(config)
    renderLinkedImage(anchor, this.getFields()?.url)
    return anchor
  }

  updateDOM(previousNode: this, anchor: HTMLAnchorElement, config: EditorConfig) {
    const shouldReplace = super.updateDOM(previousNode, anchor, config)
    renderLinkedImage(anchor, this.getFields()?.url)
    return shouldReplace
  }
}

export const NoteLinkedImagesFeatureClient = createClientFeature({
  nodes: [
    {
      replace: LinkNode,
      with: (node) =>
        new NoteLinkedImageLinkNode({
          fields: node.getFields(),
          id: node.getID(),
        }),
      withKlass: NoteLinkedImageLinkNode,
    },
  ],
})
