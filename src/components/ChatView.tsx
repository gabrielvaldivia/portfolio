type View = 'chat' | 'map'

export function ChatView({
  view,
  chatHref = '/chat/new',
  children,
}: {
  view: View
  /** Retained for call-site compatibility; navigation now lives in the site header. */
  chatHref?: string
  children: React.ReactNode
}) {
  void view
  void chatHref
  return <div className="relative h-full">{children}</div>
}
