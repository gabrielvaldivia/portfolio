'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ModuleLightboxControlContext = createContext<(() => void) | null>(null)

export function ModuleLightboxControlProvider({
  open,
  children,
}: {
  open: () => void
  children: ReactNode
}) {
  return (
    <ModuleLightboxControlContext.Provider value={open}>
      {children}
    </ModuleLightboxControlContext.Provider>
  )
}

export function useOpenModuleLightbox() {
  return useContext(ModuleLightboxControlContext)
}
