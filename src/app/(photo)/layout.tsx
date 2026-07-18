import '../(frontend)/globals.css'
import { AgentationToolbar } from '@/components/AgentationToolbar'

export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-content">
        {children}
        <AgentationToolbar />
      </body>
    </html>
  )
}
