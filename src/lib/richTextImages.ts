const linkedImageHosts = new Set(['cdn-images-1.medium.com', 'substackcdn.com'])

export function getLinkedImage(url: string, node: { children?: unknown[] }) {
  const label = (node.children || []).map((child) => (child as { text?: string })?.text || '').join('').trim()
  if (label.toLowerCase() !== 'view image') return null

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'https:' || !linkedImageHosts.has(parsedUrl.hostname)) return null
    const decodedUrl = decodeURIComponent(url)
    const sourceDimensions = decodedUrl.match(/_(\d{2,5})x(\d{2,5})(?:\.[a-z0-9]+)?(?:$|[/?])/i)
    const mediumWidth = decodedUrl.match(/\/max\/(\d{2,5})\//)?.[1]
    const width = sourceDimensions ? Number(sourceDimensions[1]) : Number(mediumWidth) || 1024
    const height = sourceDimensions ? Number(sourceDimensions[2]) : Math.round(width * 0.75)
    return { height, url: parsedUrl.toString(), width }
  } catch {
    return null
  }
}
