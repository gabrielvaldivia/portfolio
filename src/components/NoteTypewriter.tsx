'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import {
  NOTE_TYPING_ATTRIBUTE,
  buildTypingSchedule,
  markNoteSeen,
  shouldTypeNote,
  warpTypingTime,
} from '@/lib/noteTyping'

const HIGHLIGHT_NAME = 'note-typing'
const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figure, table, hr'

type Pending = { element: Element; at: number }

export function NoteTypewriter({ slug, children }: { slug: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const wrapper = rootRef.current
    const caret = caretRef.current
    // The head script hid the body for the first paint; take over from here.
    document.documentElement.removeAttribute(NOTE_TYPING_ATTRIBUTE)
    if (!wrapper || !caret || !shouldTypeNote(slug)) return

    const root = wrapper.querySelector('[data-note-highlight-body]') || wrapper
    const nodes: { node: Text; start: number }[] = []
    const pending: Pending[] = []
    const blockBreaks = new Set<number>()
    let text = ''
    let lastBlock: Element | null = null
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node instanceof Text) {
        const value = node.data
        if (!value.trim()) continue
        const block = node.parentElement?.closest(BLOCK_SELECTOR) || null
        if (block !== lastBlock && text) blockBreaks.add(text.length)
        lastBlock = block
        nodes.push({ node, start: text.length })
        text += value
      } else if (node instanceof Element) {
        // Elements (and their markers, rules, images and borders) stay hidden
        // until the caret reaches them.
        pending.push({ element: node, at: text.length })
      }
    }
    if (!text.length) {
      markNoteSeen(slug)
      return
    }

    const { times, total } = buildTypingSchedule(text, blockBreaks)
    const range = new Range()
    range.selectNodeContents(root)
    const highlight = new Highlight(range)
    highlight.priority = 10
    CSS.highlights.set(HIGHLIGHT_NAME, highlight)
    for (const { element } of pending) element.setAttribute('data-typing-pending', '')
    wrapper.setAttribute('data-typing', '')

    let typed = 0
    let nodeIndex = 0
    let pendingIndex = 0
    let frame = 0
    let done = false
    const startedAt = performance.now()

    const placeCaret = () => {
      const current = nodes[nodeIndex]
      const probe = new Range()
      probe.setStart(current.node, Math.min(typed - current.start, current.node.length))
      const rect = [...probe.getClientRects()].at(-1)
      if (!rect) return
      const origin = wrapper.getBoundingClientRect()
      caret.style.transform = `translate(${rect.left - origin.left}px, ${rect.top - origin.top}px)`
      caret.style.height = `${rect.height}px`
    }

    const render = () => {
      while (nodeIndex < nodes.length - 1 && typed >= nodes[nodeIndex + 1].start) nodeIndex += 1
      while (pendingIndex < pending.length && pending[pendingIndex].at <= typed) {
        pending[pendingIndex].element.removeAttribute('data-typing-pending')
        pendingIndex += 1
      }
      const current = nodes[nodeIndex]
      range.setStart(current.node, Math.min(typed - current.start, current.node.length))
      placeCaret()
    }

    // Mark the note seen once it finishes, is skipped or the page goes away,
    // not on mount: dev StrictMode mounts twice and would see it as seen.
    const finish = (seen = true) => {
      if (done) return
      done = true
      if (seen) markNoteSeen(slug)
      cancelAnimationFrame(frame)
      CSS.highlights.delete(HIGHLIGHT_NAME)
      for (const { element } of pending) element.removeAttribute('data-typing-pending')
      wrapper.removeAttribute('data-typing')
      removeListeners()
    }

    const tick = (now: number) => {
      const natural = warpTypingTime(now - startedAt, total)
      while (typed < text.length && times[typed] <= natural) typed += 1
      if (typed >= text.length) {
        finish()
        return
      }
      render()
      frame = requestAnimationFrame(tick)
    }

    // Skip on the visitor's own input. Wheel, touch and keys cover scrolling;
    // a plain scroll listener would also catch the router's scroll-to-top.
    const skip = () => finish()
    const skipEvents = ['pointerdown', 'keydown', 'wheel', 'touchmove', 'pagehide'] as const
    const removeListeners = () => {
      for (const type of skipEvents) window.removeEventListener(type, skip)
    }
    for (const type of skipEvents) window.addEventListener(type, skip, { passive: true })

    render()
    frame = requestAnimationFrame(tick)
    return () => {
      // Leaving mid-note counts as seen; an immediate dev remount does not.
      finish(performance.now() - startedAt > 1000)
    }
  }, [slug])

  return (
    <div ref={rootRef} data-note-typing-root="" className="relative">
      <span ref={caretRef} aria-hidden="true" className="note-typing-caret" />
      {children}
    </div>
  )
}
