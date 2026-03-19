import Image from 'next/image'
import { RichText } from '@/components/RichText'
import { VideoPlayer } from '@/components/VideoPlayer'

function TextBlock({ title, content, columns }: { title?: string; content: any; columns?: string }) {
  if (!content) return null
  if (columns === '6') {
    return (
      <div className="grid grid-cols-1 desktop:grid-cols-6 gap-10">
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
    <div>
      {title && <h3 className="mb-4">{title}</h3>}
      <RichText data={content} />
    </div>
  )
}

const bgColorMap: Record<string, string> = {
  alt: 'bg-background-alt',
  background: 'bg-background',
  elevated: 'bg-elevated',
  none: '',
  custom: '',
}

function ImageBlockComponent({ image, caption, border, columns, height, maxHeight, fit, bgColor, padding, _fillHeight }: { image: any; caption?: string; border?: boolean; columns?: string; height?: number; maxHeight?: number; fit?: string; bgColor?: string; padding?: number; _fillHeight?: boolean }) {
  if (!image?.url) return null
  const aspectRatio = image.width && image.height ? image.width / image.height : 16 / 9
  const isPreset = bgColor && bgColor in bgColorMap
  const bg = isPreset ? bgColorMap[bgColor] : (bgColor ? '' : 'bg-background-alt')
  const customBg = !isPreset && bgColor ? bgColor : undefined
  // On mobile, always use aspect ratio for natural sizing
  // On desktop, partial-row blocks fill their grid cell height
  const fillClass = _fillHeight ? 'desktop:h-full' : ''
  return (
    <div className={_fillHeight ? 'desktop:h-full' : ''}>
      <div
        className={`${bg} overflow-hidden w-full ${fillClass} ${border ? 'border border-border' : ''}`}
        style={{
          ...(height ? { height: `${height}px` } : {}),
          ...(maxHeight ? { maxHeight: `${maxHeight}px` } : {}),
          ...(customBg ? { backgroundColor: customBg } : {}),
        }}
      >
        {padding ? (
          <div className={`${fillClass}`} style={{ padding: `${padding}px` }}>
            <div className={`relative overflow-hidden ${fillClass}`} style={{ aspectRatio, ...(_fillHeight ? {} : {}) }}>
              <Image src={image.url} alt={image.alt || ''} fill className={fit === 'contain' ? 'object-contain' : 'object-cover'} sizes="100vw" />
            </div>
          </div>
        ) : (
          <div className={`relative w-full overflow-hidden ${fillClass}`} style={{ ...(!height ? { aspectRatio } : {}) }}>
            <Image src={image.url} alt={image.alt || ''} fill className={fit === 'contain' ? 'object-contain' : 'object-cover'} sizes="100vw" />
          </div>
        )}
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

function VideoBlockComponent({ video, url, caption, loop = true, muted = true, controls = false }: any) {
  const src = video?.url || url
  if (!src) return null
  return (
    <div>
      <div className="bg-background-alt overflow-hidden">
        <VideoPlayer src={src} loop={loop} muted={muted} controls={controls} className="w-full h-auto" />
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

const blockComponents: Record<string, React.ComponentType<any>> = {
  text: TextBlock,
  image: ImageBlockComponent,
  video: VideoBlockComponent,
  // Legacy block types for existing data
  sectionHeader: (props: any) => <TextBlock title={props.title} content={props.description} columns={props.columns} />,
  textContent: (props: any) => <TextBlock content={props.content} columns={props.columns} />,
  fullWidthImage: ({ image, border }: any) => <ImageBlockComponent image={image} border={border} />,
  fullWidthVideo: VideoBlockComponent,
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
  deviceMockup: ({ image }: any) => <ImageBlockComponent image={image} />,
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

export function RenderBlocks({ blocks }: { blocks?: any[] }) {
  if (!blocks?.length) return null

  // Check if any partial-row blocks use rows > 1 — if so, use fixed row sizing
  const hasMultiRow = blocks.some(
    (b) => b.columns && b.columns !== '6' && b.rows && b.rows !== '1',
  )

  return (
    <div
      className={`grid grid-cols-1 desktop:grid-cols-6 desktop:grid-flow-dense gap-x-10 gap-y-10 tablet:gap-y-14 desktop:gap-y-20 ${hasMultiRow ? 'multi-row-grid' : ''}`}
    >
      {hasMultiRow && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 1280px) {
            .multi-row-grid { grid-auto-rows: minmax(250px, auto); }
          }
        ` }} />
      )}
      {blocks.map((block, i) => {
        const Component = blockComponents[block.blockType]
        if (!Component) return null
        const cols = block.columns || '6'
        const rows = block.rows || '1'
        const isPartialRow = cols !== '6'
        return (
          <div
            key={block.id || i}
            className={`${colSpan[cols] || 'desktop:col-span-6'} ${rows !== '1' ? (rowSpan[rows] || '') : ''} ${isPartialRow ? 'desktop:h-full' : ''}`}
          >
            <div className={isPartialRow || rows !== '1' ? 'desktop:h-full' : ''}>
              <Component {...block} _fillHeight={isPartialRow} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
