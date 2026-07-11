import { RichText } from '@/components/RichText'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import {
  ImageBlockComponent,
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
  imageGrid: ({ images, columns }: any) => {
    if (!images?.length) return null
    return (
      <div className={`grid gap-10 ${columns === '3' ? 'grid-cols-3' : columns === '1' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((item: any, i: number) => (
          <ImageBlockComponent key={i} image={item.image} border={item.border} />
        ))}
      </div>
    )
  },
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

function getImageGridSlideId(block: any, blockIndex: number, itemIndex: number) {
  return `${getBaseSlideId(block, blockIndex)}:image-grid:${itemIndex}`
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
  return [
    'image',
    'fullWidthImage',
    'deviceMockup',
    'video',
    'fullWidthVideo',
  ].includes(blockType || '')
}

function getVideoAspectRatio(block: any) {
  const width = Number(block?.video?.width)
  const height = Number(block?.video?.height)

  return width > 0 && height > 0 ? width / height : undefined
}

function getImageGridSlide(block: any, blockIndex: number, item: any, itemIndex: number, likeNamespace?: string): ModuleLightboxSlide {
  const imageBlock = {
    id: getImageGridSlideId(block, blockIndex, itemIndex),
    blockType: 'image',
    image: item.image,
    border: item.border,
    imageBorder: item.imageBorder,
    rounded: item.rounded,
    shadow: item.shadow,
    fit: item.fit || 'contain',
    bgColor: item.bgColor || 'alt',
    padding: item.padding || '0',
    caption: item.caption,
    rows: 'wrap',
    columns: '6',
  }

  return {
    id: imageBlock.id,
    type: 'module',
    block: imageBlock,
    label: item.image?.alt ? `Open ${item.image.alt} fullscreen` : `Open image ${itemIndex + 1} fullscreen`,
    likeTargetId: likeNamespace ? getModuleLikeTargetId(likeNamespace, imageBlock, itemIndex) : null,
    preserveAspectDuringZoom: true,
  }
}

function getModuleLightboxSlides(blocks: any[], likeNamespace?: string): ModuleLightboxSlide[] {
  return blocks.flatMap((block, blockIndex) => {
    if (!lightboxableBlockTypes.includes(block.blockType)) return []

    if (block.blockType === 'imageGrid') {
      return Array.isArray(block.images)
        ? block.images
          .filter((item: any) => item?.image?.url)
          .map((item: any, itemIndex: number) => getImageGridSlide(block, blockIndex, item, itemIndex, likeNamespace))
        : []
    }

    return [{
      id: getBlockSlideId(block, blockIndex),
      type: 'module' as const,
      block,
      label: getModuleLabel(block, `Open ${block.blockType} module fullscreen`),
      likeTargetId: likeNamespace && isLikeableModuleBlock(block.blockType)
        ? getModuleLikeTargetId(likeNamespace, block, blockIndex)
        : null,
      preserveAspectDuringZoom: shouldPreserveAspectDuringZoom(block.blockType),
    }]
  })
}

function renderImageGridWithLightbox(block: any, blockIndex: number, likeNamespace?: string) {
  if (!block.images?.length) return null

  return (
    <div className={`grid gap-10 ${block.columns === '3' ? 'grid-cols-3' : block.columns === '1' ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {block.images.map((item: any, itemIndex: number) => {
        if (!item?.image?.url) return null
        const slide = getImageGridSlide(block, blockIndex, item, itemIndex, likeNamespace)
        return (
          <ModuleLightboxTrigger key={slide.id} slideId={slide.id} label={slide.label} preserveAspectDuringZoom>
            <ImageBlockComponent image={item.image} border={item.border} />
          </ModuleLightboxTrigger>
        )
      })}
    </div>
  )
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
        const isPhoneFrameBlock = phoneFrameBlockTypes.includes(block.blockType)
        const isDC1Block = block.blockType === 'dc1'
        const moduleBackgroundClass = isFramedBlock ? 'bg-background-alt' : ''
        const likeTargetId = likeNamespace && isLikeableModuleBlock(block.blockType)
          ? getModuleLikeTargetId(likeNamespace, block, i)
          : null
        const rendersOwnLikeButton = internalLikeButtonBlockTypes.includes(block.blockType)
        const slideId = lightboxEnabled && lightboxableBlockTypes.includes(block.blockType) && block.blockType !== 'imageGrid'
          ? getBlockSlideId(block, i)
          : null
        const slideLabel = slideId ? getModuleLabel(block, `Open ${block.blockType} module fullscreen`) : ''
        const content = block.blockType === 'imageGrid' && lightboxEnabled
          ? renderImageGridWithLightbox(block, i, likeNamespace)
          : <Component {...block} _likeTargetId={rendersOwnLikeButton ? likeTargetId : null} />

        return (
          <div
            key={block.id || i}
            id={likeTargetId ? getModuleLikeAnchorId(likeTargetId) : undefined}
            className={cn(
              colSpan[cols] || 'desktop:col-span-6',
              rows !== '1' ? (rowSpan[rows] || '') : '',
              moduleBackgroundClass,
              isFramedBlock ? 'p-5 tablet:p-8 desktop:p-10' : '',
              isDC1Block ? 'py-6 tablet:py-10 desktop:py-12' : '',
              likeTargetId ? 'group/module relative' : '',
            )}
          >
            {slideId ? (
              isPhoneFrameBlock ? (
                <div className="h-full flex items-center justify-center">
                  <ModuleLightboxTrigger
                    slideId={slideId}
                    label={slideLabel}
                    className="mx-auto flex h-full w-fit max-w-full items-center justify-center"
                  >
                    {content}
                  </ModuleLightboxTrigger>
                </div>
              ) : (
                <ModuleLightboxTrigger
                  slideId={slideId}
                  label={slideLabel}
                  className={isFramedBlock ? 'h-full' : ''}
                  fallbackAspectRatio={getVideoAspectRatio(block)}
                  preserveAspectDuringZoom={shouldPreserveAspectDuringZoom(block.blockType)}
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
            {likeTargetId && !rendersOwnLikeButton && <ModuleLikeOverlay targetId={likeTargetId} />}
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
