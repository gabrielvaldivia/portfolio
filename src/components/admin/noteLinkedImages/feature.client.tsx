'use client'

import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

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

function renderLinkedImages(root: HTMLElement) {
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    renderLinkedImage(anchor, anchor.href)
  }
}

function NoteLinkedImagesPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    let animationFrame: number | undefined

    const render = () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        const root = editor.getRootElement()
        if (root) renderLinkedImages(root)
      })
    }

    const unregisterRootListener = editor.registerRootListener(render)
    const unregisterUpdateListener = editor.registerUpdateListener(render)
    render()

    return () => {
      unregisterRootListener()
      unregisterUpdateListener()
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
    }
  }, [editor])

  return null
}

export const NoteLinkedImagesFeatureClient = createClientFeature({
  plugins: [
    {
      Component: NoteLinkedImagesPlugin,
      position: 'normal',
    },
  ],
})
