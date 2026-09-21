'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { NotesSubscribeForm } from '@/components/NotesSubscribeForm'

const compactQuery = '(max-width: 1023px)'

function subscribeToCompactLayout(onChange: () => void) {
  const query = window.matchMedia(compactQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getCompactSnapshot = () => window.matchMedia(compactQuery).matches
const getServerCompactSnapshot = () => false

function RssLink() {
  return (
    <div className="mt-6 text-center text-caption text-text-muted">
      <a
        href="/notes/rss.xml"
        type="application/rss+xml"
        className="rounded-sm underline decoration-border-strong underline-offset-4 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
      >
        Subscribe via RSS
      </a>
    </div>
  )
}

function MobileNotesSubscribe() {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const layoutId = useId()
  const reduceMotion = useReducedMotion()
  const transition = { duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' as const }
  const surfaceTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, duration: 0.2, bounce: 0.18 }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <LayoutGroup id={layoutId}>
        <Dialog.Portal forceMount>
          <motion.div layoutRoot className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-5 lg:hidden">
            <Dialog.Trigger asChild>
              <motion.button
                layoutId={reduceMotion ? undefined : 'subscribe-surface'}
                style={{ borderRadius: 28 }}
                transition={surfaceTransition}
                type="button"
                className="pointer-events-auto flex h-14 cursor-pointer items-center justify-center bg-floating px-6 text-sm font-medium text-text-body backdrop-blur-[40px] hover:bg-background-alt-hover hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
              >
                <motion.span
                  animate={{ opacity: open ? 0 : 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.1 }}
                >
                  Subscribe
                </motion.span>
              </motion.button>
            </Dialog.Trigger>
          </motion.div>

          <AnimatePresence>
            {open && (
              <motion.div key="subscribe-modal" layoutRoot className="pointer-events-none fixed inset-0 z-70">
                <Dialog.Overlay forceMount asChild>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="pointer-events-auto absolute inset-0 bg-black/25"
                  />
                </Dialog.Overlay>
                <Dialog.Content
                  forceMount
                  asChild
                  onOpenAutoFocus={(event) => {
                    event.preventDefault()
                    // Keep controls unfocused while preserving the dialog's focus trap.
                    contentRef.current?.focus({ preventScroll: true })
                  }}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <motion.div
                    ref={contentRef}
                    layoutId={reduceMotion ? undefined : 'subscribe-surface'}
                    style={{ borderRadius: 16 }}
                    transition={surfaceTransition}
                    className="pointer-events-auto absolute inset-x-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] mx-auto max-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-lg overflow-y-auto overscroll-contain bg-elevated p-6 text-text-strong outline-none"
                  >
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.08, delay: 0 } }}
                      transition={transition}
                    >
                      <Dialog.Title className="sr-only">Subscribe to Notes</Dialog.Title>
                      <Dialog.Description className="sr-only">Receive new notes by email or subscribe via RSS.</Dialog.Description>
                      <Dialog.Close
                        aria-label="Close subscription form"
                        className="absolute -right-3 -top-3 flex size-11 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-background-alt hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
                      >
                        <X className="size-5" aria-hidden="true" />
                      </Dialog.Close>
                      <NotesSubscribeForm layout="modal" />
                      <RssLink />
                    </motion.div>
                  </motion.div>
                </Dialog.Content>
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </LayoutGroup>
    </Dialog.Root>
  )
}

export function NotesSubscribePanel() {
  const compact = useSyncExternalStore(subscribeToCompactLayout, getCompactSnapshot, getServerCompactSnapshot)

  if (compact) return <MobileNotesSubscribe />

  return (
    <aside className="top-24 hidden min-w-0 self-start lg:order-2 lg:sticky lg:block desktopXL:top-9">
      <NotesSubscribeForm layout="sidebar" />
      <RssLink />
    </aside>
  )
}
