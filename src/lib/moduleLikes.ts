export const MAX_MODULE_LIKES_PER_VISITOR = 50
export const SUPER_MODULE_LIKE_AMOUNT = 5

export type ModuleLikeData = {
  count: number
  userLikes: number
  hasLiked: boolean
  canLike: boolean
}

const textBlockTypes = new Set(['text', 'textBlock', 'textContent', 'sectionHeader'])

export function isLikeableModuleBlock(blockType?: string) {
  return Boolean(blockType && !textBlockTypes.has(blockType))
}

export function getModuleLikeTargetId(namespace: string, block: any, index: number) {
  const blockId =
    typeof block?.id === 'string' || typeof block?.id === 'number'
      ? String(block.id)
      : `${block?.blockType || 'module'}-${index}`

  return `${namespace}:${block?.blockType || 'module'}:${blockId}`
}

export function getModuleLikeAnchorId(targetId: string) {
  return `module-${targetId.replace(/[^a-z0-9_-]+/gi, '-')}`
}

export function parseModuleLikeTargetId(targetId: string) {
  const [sourceType, slug, blockType, ...blockIdParts] = targetId.split(':')
  const blockId = blockIdParts.join(':')

  if (!sourceType || !slug || !blockType || !blockId) return null
  if (sourceType !== 'project' && sourceType !== 'side-project') return null

  return { sourceType, slug, blockType, blockId }
}
