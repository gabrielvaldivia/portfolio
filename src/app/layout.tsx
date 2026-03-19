import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gabriel Valdivia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
