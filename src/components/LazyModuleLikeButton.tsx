'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/cn'

type ModuleLikeButtonProps = {
  targetId: string
  initialCount?: number
  noun?: string
  tabIndex?: number
  variant?: 'default' | 'pill'
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

export function ModuleLikeButtonShell({
  initialCount = 0,
  noun = 'module',
  tabIndex,
  variant = 'default',
}: {
  initialCount?: number
  noun?: string
  tabIndex?: number
  variant?: 'default' | 'pill'
}) {
  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        tabIndex={tabIndex}
        disabled
        aria-label={`Like this ${noun}. ${initialCount} total likes.`}
        className={cn(
          'inline-flex touch-manipulation select-none items-center gap-1.5 rounded-full font-medium text-muted transition-colors duration-150',
          variant === 'pill'
            ? 'h-11 min-w-11 justify-center px-3 text-sm'
            : 'h-8 bg-elevated px-2.5 text-caption shadow-sm outline outline-1 outline-offset-0 outline-gray-400/40',
          'disabled:cursor-default',
          variant !== 'pill' && 'disabled:opacity-70',
        )}
      >
        <span className="relative inline-flex size-[18px] items-center justify-center overflow-visible">
          {variant === 'pill' && initialCount === 0
            ? <Heart className="size-[18px]" aria-hidden="true" />
            : <HeartIcon className={cn('size-[18px]', variant !== 'pill' && 'opacity-45')} />}
        </span>
        <span aria-hidden="true" className={cn('relative inline-flex h-[1em] min-w-[1ch] items-center overflow-hidden tabular-nums leading-none', variant === 'pill' && 'shrink-0', initialCount === 0 && 'invisible')}>
          <span className="inline-block">{variant === 'pill' ? initialCount.toLocaleString('en-US', { notation: 'compact' }) : initialCount}</span>
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
        : (
          <ModuleLikeButtonShell
            initialCount={props.initialCount}
            noun={props.noun}
            tabIndex={props.tabIndex}
            variant={props.variant}
          />
        )}
    </div>
  )
}
