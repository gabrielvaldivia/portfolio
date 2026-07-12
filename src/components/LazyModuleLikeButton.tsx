'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { cn } from '@/lib/cn'

type ModuleLikeButtonProps = {
  targetId: string
  initialCount?: number
}

const HEART_ICON_SIZE = 18

function HeartIcon({ className, size = HEART_ICON_SIZE }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 21.75c-.33 0-.65-.12-.9-.35C5.18 16.05 2 13.06 2 8.8 2 5.43 4.6 3 7.8 3c1.8 0 3.36.78 4.2 2 .84-1.22 2.4-2 4.2-2C19.4 3 22 5.43 22 8.8c0 4.26-3.18 7.25-9.1 12.6-.25.23-.57.35-.9.35Z"
      />
    </svg>
  )
}

export function ModuleLikeButtonShell({ initialCount = 0 }: { initialCount?: number }) {
  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        disabled
        aria-label={`Like this module. ${initialCount} total likes.`}
        className={cn(
          'inline-flex h-8 touch-manipulation select-none items-center gap-1.5 rounded-full bg-elevated px-2.5 text-caption font-medium text-muted shadow-sm outline outline-1 outline-offset-0 outline-gray-400/40 transition-colors duration-150',
          'disabled:cursor-default disabled:opacity-70',
        )}
      >
        <span className="relative inline-flex size-[18px] items-center justify-center overflow-visible">
          <HeartIcon className="size-[18px] opacity-45" />
        </span>
        <span className="relative inline-flex h-[1em] min-w-[1ch] items-center overflow-hidden tabular-nums leading-none">
          <span className="inline-block">{initialCount}</span>
        </span>
      </button>
    </div>
  )
}

export function LazyModuleLikeButton(props: ModuleLikeButtonProps) {
  const [LoadedButton, setLoadedButton] = useState<ComponentType<ModuleLikeButtonProps> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)

  const loadButton = useCallback(() => {
    if (LoadedButton || loadingRef.current) return
    loadingRef.current = true

    void import('./ModuleLikeButton')
      .then((mod) => {
        if (mountedRef.current) setLoadedButton(() => mod.ModuleLikeButton)
      })
      .catch(() => {
        loadingRef.current = false
      })
  }, [LoadedButton])

  useEffect(() => {
    mountedRef.current = true
    const root = rootRef.current

    if (!root || typeof IntersectionObserver === 'undefined') {
      loadButton()
      return () => {
        mountedRef.current = false
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      loadButton()
    }, {
      rootMargin: '1000px 0px',
    })
    observer.observe(root)

    return () => {
      mountedRef.current = false
      observer.disconnect()
    }
  }, [loadButton])

  return (
    <div
      ref={rootRef}
      onFocusCapture={loadButton}
      onPointerEnter={loadButton}
      onPointerDownCapture={loadButton}
    >
      {LoadedButton
        ? <LoadedButton {...props} />
        : <ModuleLikeButtonShell initialCount={props.initialCount} />}
    </div>
  )
}
