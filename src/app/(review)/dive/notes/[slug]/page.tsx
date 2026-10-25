export const revalidate = 3600

// Render each path on first visit, then cache it for the revalidate window.
// Without this, Next renders the route on every request.
export async function generateStaticParams() {
  return []
}
export { default } from '@/app/(frontend)/notes/[slug]/page'
