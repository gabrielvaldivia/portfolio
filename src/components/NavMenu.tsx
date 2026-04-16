'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pages = [
  { label: 'Home', url: '/' },
  { label: 'Work', url: '/work' },
  { label: 'About', url: '/about' },
  { label: 'Chat', url: '/chat' },
  { label: 'Playground', url: '/playground' },
  { label: 'Clients', url: '/clients' },
  { label: 'People', url: '/people' },
]

export function NavMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Desktop — top right */}
      <nav className="fixed top-0 right-0 z-50 hidden tablet:block p-10">
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[40px] transition-colors cursor-pointer ${
              open ? 'bg-content' : 'bg-floating hover:bg-hover'
            }`}
            style={open ? { color: 'var(--color-nav-active-text)' } : undefined}
          >
            <div className="w-4 h-3 relative flex flex-col justify-center items-center">
              <span
                className={`block h-[1.5px] w-4 bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'rotate-45 top-[5px]' : 'top-[2px]'
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'w-4 -rotate-45 top-[5px]' : 'w-2.5 top-[9px]'
                }`}
              />
            </div>
          </button>

          {/* Popover */}
          <div
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {pages.map((page) => {
              const isActive = pathname === page.url || (page.url !== '/' && pathname?.startsWith(page.url))
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 py-1.5 transition-all text-body ${
                    isActive
                      ? 'text-content opacity-100'
                      : 'text-content opacity-30 hover:opacity-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-current' : 'bg-transparent'}`} />
                  {page.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile — top right */}
      <nav className="fixed top-0 right-0 z-[61] tablet:hidden p-4">
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[40px] transition-colors cursor-pointer ${
              open ? 'bg-content' : 'bg-floating hover:bg-hover'
            }`}
            style={open ? { color: 'var(--color-nav-active-text)' } : undefined}
          >
            <div className="w-4 h-3 relative flex flex-col justify-center items-center">
              <span
                className={`block h-[1.5px] w-4 bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'rotate-45 top-[5px]' : 'top-[2px]'
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'w-4 -rotate-45 top-[5px]' : 'w-2.5 top-[9px]'
                }`}
              />
            </div>
          </button>

          {/* Popover — opens downward on mobile */}
          <div
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {pages.map((page) => {
              const isActive = pathname === page.url || (page.url !== '/' && pathname?.startsWith(page.url))
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 py-1.5 transition-all text-body ${
                    isActive
                      ? 'text-content opacity-100'
                      : 'text-content opacity-30 hover:opacity-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-current' : 'bg-transparent'}`} />
                  {page.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
