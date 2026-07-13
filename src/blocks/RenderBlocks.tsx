import { RichText } from '@/components/RichText'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import {
  ModuleLikeOverlay,
  framedBlockTypes,
  internalLikeButtonBlockTypes,
  lightboxableBlockTypes,
  mediaBlockComponents,
  phoneFrameBlockTypes,
} from '@/blocks/MediaBlockComponents'
import { cn } from '@/lib/cn'
import { getModuleLikeAnchorId, getModuleLikeTargetId, isLikeableModuleBlock } from '@/lib/moduleLikes'

function TextBlock({ title, content, columns }: { title?: string; content: any; columns?: string }) {
  if (!content) return null
  if (columns === '6') {
    return (
      <div className="grid grid-cols-1 desktop:grid-cols-6 gap-2 tablet:gap-6 desktop:gap-10 py-8 tablet:py-12 desktop:py-20">
        <div className="desktop:col-span-2">
          {title && <h3>{title}</h3>}
        </div>
        <div className="desktop:col-span-4">
          <RichText data={content} />
        </div>
      </div>
    )
  }
  return (
    <div className="py-8 tablet:py-12 desktop:py-20">
      {title && <h3 className="mb-4">{title}</h3>}
      <RichText data={content} />
    </div>
  )
}

const blockComponents: Record<string, React.ComponentType<any>> = {
  ...mediaBlockComponents,
  text: TextBlock,
  sectionHeader: (props: any) => <TextBlock title={props.title} content={props.description} columns={props.columns} />,
  textContent: (props: any) => <TextBlock content={props.content} columns={props.columns} />,
  textBlock: (props: any) => <TextBlock content={props.content} columns={props.columns} />,
  twoColumn: () => null,
}

const colSpan: Record<string, string> = {
  '1': 'desktop:col-span-1',
  '2': 'desktop:col-span-2',
  '3': 'desktop:col-span-3',
  '4': 'desktop:col-span-4',
  '5': 'desktop:col-span-5',
  '6': 'desktop:col-span-6',
}

const rowSpan: Record<string, string> = {
  '1': 'desktop:row-span-1',
  '2': 'desktop:row-span-2',
  '3': 'desktop:row-span-3',
  '4': 'desktop:row-span-4',
  '5': 'desktop:row-span-5',
  '6': 'desktop:row-span-6',
}

function isProjectLightboxNamespace(namespace?: string) {
  return namespace?.startsWith('project:') || namespace?.startsWith('side-project:')
}

function getBaseSlideId(block: any, index: number) {
  return `${block.id || `${block.blockType}-${index}`}`
}

function getBlockSlideId(block: any, blockIndex: number) {
  return `${getBaseSlideId(block, blockIndex)}:${block.blockType}`
}

function getModuleLabel(block: any, fallback: string) {
  if (block.caption) return `Open ${block.caption} fullscreen`
  if (block.image?.alt) return `Open ${block.image.alt} fullscreen`
  return fallback
}

function shouldPreserveAspectDuringZoom(blockType?: string) {
  return framedBlockTypes.includes(blockType || '') || [
    'image',
    'fullWidthImage',
    'deviceMockup',
    'video',
    'fullWidthVideo',
  ].includes(blockType || '')
}

function shouldUseMovableSurface(blockType?: string) {
  return phoneFrameBlockTypes.includes(blockType || '')
    || blockType === 'browser'
    || blockType === 'image'
    || blockType === 'fullWidthImage'
    || blockType === 'deviceMockup'
    || blockType === 'video'
    || blockType === 'fullWidthVideo'
}

function getVideoAspectRatio(block: any) {
  const width = Number(block?.video?.width)
  const height = Number(block?.video?.height)

  return width > 0 && height > 0 ? width / height : undefined
}

function getModuleLightboxSlides(blocks: any[], likeNamespace?: string): ModuleLightboxSlide[] {
  return blocks.flatMap((block, blockIndex) => {
    if (!lightboxableBlockTypes.includes(block.blockType)) return []

    return [{
      id: getBlockSlideId(block, blockIndex),
      type: 'module' as const,
      block,
      label: getModuleLabel(block, `Open ${block.blockType} module fullscreen`),
      likeTargetId: likeNamespace && isLikeableModuleBlock(block.blockType)
        ? getModuleLikeTargetId(likeNamespace, block, blockIndex)
        : null,
      preserveAspectDuringZoom: shouldPreserveAspectDuringZoom(block.blockType),
      movableSurface: shouldUseMovableSurface(block.blockType),
    }]
  })
}

export function RenderBlocks({ blocks, likeNamespace }: { blocks?: any[]; likeNamespace?: string }) {
  if (!blocks?.length) return null

  const lightboxEnabled = isProjectLightboxNamespace(likeNamespace)
  const lightboxSlides = lightboxEnabled ? getModuleLightboxSlides(blocks, likeNamespace) : []

  const grid = (
    <div className="grid grid-cols-1 desktop:grid-cols-6 desktop:grid-flow-dense gap-5 tablet:gap-10 content-block-grid">
      {blocks.map((block, i) => {
        const Component = blockComponents[block.blockType]
        if (!Component) return null
        const cols = block.columns || '6'
        const rows = block.rows || '1'
        const isFramedBlock = framedBlockTypes.includes(block.blockType)
        const usesMovableSurface = shouldUseMovableSurface(block.blockType)
        const opensOnlyFromVideoControl = (block.blockType === 'video' || block.blockType === 'fullWidthVideo') && Boolean(block.controls)
        const isDC1Block = block.blockType === 'dc1'
        const moduleBackgroundClass = isFramedBlock ? 'bg-background-alt' : ''
        const likeTargetId = likeNamespace && isLikeableModuleBlock(block.blockType)
          ? getModuleLikeTargetId(likeNamespace, block, i)
          : null
        const rendersOwnLikeButton = internalLikeButtonBlockTypes.includes(block.blockType)
        const slideId = lightboxEnabled && lightboxableBlockTypes.includes(block.blockType)
          ? getBlockSlideId(block, i)
          : null
        const slideLabel = slideId ? getModuleLabel(block, `Open ${block.blockType} module fullscreen`) : ''
        const content = <Component {...block} _likeTargetId={rendersOwnLikeButton ? likeTargetId : null} />

        return (
          <div
            key={block.id || i}
            id={likeTargetId ? getModuleLikeAnchorId(likeTargetId) : undefined}
            data-lightbox-source-container={isFramedBlock && !usesMovableSurface ? '' : undefined}
            className={cn(
              colSpan[cols] || 'desktop:col-span-6',
              rows !== '1' ? (rowSpan[rows] || '') : '',
              !usesMovableSurface ? moduleBackgroundClass : '',
              isFramedBlock && !usesMovableSurface ? 'p-5 tablet:p-8 desktop:p-10' : '',
              isDC1Block && !usesMovableSurface ? 'py-6 tablet:py-10 desktop:py-12' : '',
              likeTargetId && !usesMovableSurface ? 'group/module relative' : '',
            )}
          >
            {slideId ? (
              usesMovableSurface ? (
                <ModuleLightboxTrigger
                  slideId={slideId}
                  label={slideLabel}
                  className="h-full"
                  surfaceClassName={cn(
                    'relative',
                    isFramedBlock ? moduleBackgroundClass : '',
                    isFramedBlock ? 'flex items-center justify-center p-5 tablet:p-8 desktop:p-10' : '',
                    isDC1Block ? 'py-6 tablet:py-10 desktop:py-12' : '',
                    likeTargetId ? 'group/module' : '',
                  )}
                  preserveAspectDuringZoom
                  movableSurface
                  openOnClick={!opensOnlyFromVideoControl}
                >
                  {isFramedBlock ? (
                    <div className="flex h-full w-full items-center justify-center">
                      {content}
                    </div>
                  ) : content}
                  {likeTargetId && !rendersOwnLikeButton && <ModuleLikeOverlay targetId={likeTargetId} />}
                </ModuleLightboxTrigger>
              ) : (
                <ModuleLightboxTrigger
                  slideId={slideId}
                  label={slideLabel}
                  className={isFramedBlock ? 'h-full' : ''}
                  fallbackAspectRatio={getVideoAspectRatio(block)}
                  preserveAspectDuringZoom={shouldPreserveAspectDuringZoom(block.blockType)}
                  sourceContainer={isFramedBlock}
                >
                  <div className={isFramedBlock ? 'h-full flex items-center justify-center' : ''}>
                    {content}
                  </div>
                </ModuleLightboxTrigger>
              )
            ) : (
              <div className={isFramedBlock ? 'h-full flex items-center justify-center' : ''}>
                {content}
              </div>
            )}
            {likeTargetId && !rendersOwnLikeButton && !usesMovableSurface && <ModuleLikeOverlay targetId={likeTargetId} />}
          </div>
        )
      })}
    </div>
  )

  if (!lightboxEnabled || lightboxSlides.length === 0) return grid

  return (
    <ModuleLightboxProvider slides={lightboxSlides}>
      {grid}
    </ModuleLightboxProvider>
  )
}
