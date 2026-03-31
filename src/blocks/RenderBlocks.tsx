import Image from 'next/image'
import { RichText } from '@/components/RichText'
import { VideoPlayer } from '@/components/VideoPlayer'
import { LazyVideo } from '@/components/LazyVideo'

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

const bgColorMap: Record<string, string> = {
  alt: 'bg-background-alt',
  background: 'bg-background',
  elevated: 'bg-elevated',
  none: '',
  custom: '',
}

// Responsive padding: scale down on smaller screens
const paddingClasses: Record<string, string> = {
  '10': 'p-2 tablet:p-2.5',
  '20': 'p-3 tablet:p-5',
  '40': 'p-5 tablet:p-8 desktop:p-10',
  '60': 'p-6 tablet:p-10 desktop:p-[60px]',
  '80': 'p-8 tablet:p-12 desktop:p-20',
}

const ROW_HEIGHT = 200
const ROW_GAP = 40 // matches desktop gap-10

function ImageBlockComponent({ image, caption, border, imageBorder, rounded, shadow, columns, rows, height, maxHeight, fit, bgColor, padding, _fillHeight }: { image: any; caption?: string; border?: boolean; imageBorder?: boolean; rounded?: boolean; shadow?: boolean; columns?: string; rows?: string; height?: number; maxHeight?: number; fit?: string; bgColor?: string; padding?: string | number; _fillHeight?: boolean }) {
  // Legacy: height/maxHeight still supported for old data but no longer in admin
  if (!image?.url) return null
  const aspectRatio = image.width && image.height ? image.width / image.height : 16 / 9
  const isPreset = bgColor && bgColor in bgColorMap
  const bg = isPreset ? bgColorMap[bgColor] : (bgColor ? '' : 'bg-background-alt')
  const customBg = !isPreset && bgColor ? bgColor : undefined
  const padStr = String(padding || '0')
  const padClass = paddingClasses[padStr] || ''
  const hasPadding = padStr !== '0' && padClass
  const isWrap = !rows || rows === 'wrap'
  const rowCount = isWrap ? 0 : parseInt(rows, 10)
  const rowHeight = rowCount > 0 ? ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1) : null
  return (
    <div>
      <div
        className={`${bg} w-full relative ${hasPadding ? padClass : ''} ${!hasPadding ? 'overflow-hidden' : ''}`}
        style={{
          ...(customBg ? { backgroundColor: customBg } : {}),
        }}
      >
        <div
          className={`relative w-full ${shadow ? '' : 'overflow-hidden'} ${rounded ? 'rounded-lg tablet:rounded-xl desktop:rounded-2xl' : ''} ${fit === 'contain' ? 'flex items-center justify-center' : ''}`}
          style={{ aspectRatio, ...(rowHeight ? { ['--row-height' as string]: `${rowHeight}px` } : {}) }}
        >
          {imageBorder && <div className={`absolute inset-0 z-10 ring-1 ring-inset ring-border pointer-events-none ${rounded ? 'rounded-lg tablet:rounded-xl desktop:rounded-2xl' : ''}`} />}
          <Image src={image.url} alt={image.alt || ''} fill className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} ${rounded ? 'rounded-lg tablet:rounded-xl desktop:rounded-2xl' : ''} ${shadow ? 'drop-shadow-md' : ''}`} sizes={columns === '1' ? '16vw' : columns === '2' ? '33vw' : columns === '3' ? '50vw' : columns === '4' ? '66vw' : '100vw'} />
        </div>
        {border && <div className="absolute inset-0 z-10 ring-1 ring-inset pointer-events-none" style={{ '--tw-ring-color': 'rgba(0,0,0,0.1)' } as React.CSSProperties} />}
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

function VideoBlockComponent({ video, url, caption, rows, columns, fit, bgColor, padding, border, loop = true, muted = true, controls = false }: any) {
  const src = video?.url || url
  if (!src) return null
  const isWrap = !rows || rows === 'wrap'
  const rowCount = isWrap ? 0 : parseInt(rows, 10)
  const rowHeight = rowCount > 0 ? ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1) : null
  const isPreset = bgColor && bgColor in bgColorMap
  const bg = isPreset ? bgColorMap[bgColor] : (bgColor ? '' : 'bg-background-alt')
  const customBg = !isPreset && bgColor ? bgColor : undefined
  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover'
  const padStr = String(padding || '0')
  const padClass = paddingClasses[padStr] || ''
  const hasPadding = padStr !== '0' && padClass
  return (
    <div>
      <div
        className={`${bg} overflow-hidden ${border ? 'border border-border' : ''} ${hasPadding ? padClass : ''}`}
        style={{ ...(rowHeight ? { ['--row-height' as string]: `${rowHeight}px` } : {}), ...(customBg ? { backgroundColor: customBg } : {}) }}
      >
        <VideoPlayer src={src} loop={loop} muted={muted} controls={controls} className={`w-full h-full ${objectFit}`} />
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

const DC1_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/DC1.png'
const IPHONE15_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15.png'
const IPHONE15_NOTCH_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15-notch.png'
const IPHONE13MINI_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-13-mini.png'
const IPHONE5_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone5.png'
const IPHONE6_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone6-frame.png'
const IPHONEX_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphonex.png'

function DC1Block({ id: blockId, video, rows }: { id?: string; video: any; rows?: string }) {
  const src = video?.url
  if (!src) return null
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `dc1-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 718 / 960; width: 100%; }
        @media (min-width: 1280px) {
          #${id} { aspect-ratio: 718 / 960; height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div id={id} className="relative mx-auto overflow-hidden">
        <div className="absolute inset-[6%] z-0">
          <LazyVideo src={src} className="w-full h-full object-cover" />
        </div>
        <img
          src={DC1_FRAME_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy"
        />
      </div>
    </>
  )
}

function iPhone15Block({ id: blockId, video, image, rows, showNotch }: { id?: string; video: any; image?: any; rows?: string; showNotch?: boolean }) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone15-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 2005 / 4096; max-width: 100%; height: 480px; }
        @media (min-width: 810px) {
          #${id} { height: 600px; }
        }
        @media (min-width: 1280px) {
          #${id} { height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div className="w-full h-full flex items-center justify-center">
        <div id={id} className="relative overflow-hidden">
        <div className="absolute z-0 overflow-hidden" style={{ top: '2.1%', bottom: '2.0%', left: '4.9%', right: '4.9%', borderRadius: '5%' }}>
          {isVideo ? (
            <LazyVideo src={src} className="w-full h-full object-cover" />
          ) : (
            <img src={src} alt={image?.alt || ''} className="w-full h-full object-cover" loading="lazy" />
          )}
        </div>
        <img
          src={showNotch ? IPHONE15_NOTCH_FRAME_URL : IPHONE15_FRAME_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy"
        />
        </div>
      </div>
    </>
  )
}

function iPhone13MiniBlock({ id: blockId, video, image, rows }: { id?: string; video: any; image?: any; rows?: string }) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone13mini-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 553 / 1024; max-width: 100%; height: 480px; }
        @media (min-width: 810px) {
          #${id} { height: 600px; }
        }
        @media (min-width: 1280px) {
          #${id} { height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div className="w-full h-full flex items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '7.3%', bottom: '7.2%', left: '13.5%', right: '13.5%', borderRadius: '5%' }}>
            {isVideo ? (
              <LazyVideo src={src} className="w-full h-full object-cover" />
            ) : (
              <img src={src} alt={image?.alt || ''} className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          <img
            src={IPHONE13MINI_FRAME_URL}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy"
          />
        </div>
      </div>
    </>
  )
}

function iPhone5Block({ id: blockId, video, image, rows }: { id?: string; video: any; image?: any; rows?: string }) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone5-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 762 / 1597; max-width: 100%; height: 480px; }
        @media (min-width: 810px) {
          #${id} { height: 600px; }
        }
        @media (min-width: 1280px) {
          #${id} { height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div className="w-full h-full flex items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '14.3%', bottom: '13.7%', left: '8.2%', right: '6.9%' }}>
            {isVideo ? (
              <LazyVideo src={src} className="w-full h-full object-cover" />
            ) : (
              <img src={src} alt={image?.alt || ''} className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          <img src={IPHONE5_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

function iPhone6Block({ id: blockId, video, image, rows }: { id?: string; video: any; image?: any; rows?: string }) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone6-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 990 / 1934; max-width: 100%; height: 480px; }
        @media (min-width: 810px) {
          #${id} { height: 600px; }
        }
        @media (min-width: 1280px) {
          #${id} { height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div className="w-full h-full flex items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '15.4%', bottom: '15.6%', left: '12.2%', right: '11.7%' }}>
            {isVideo ? (
              <LazyVideo src={src} className="w-full h-full object-cover" />
            ) : (
              <img src={src} alt={image?.alt || ''} className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          <img src={IPHONE6_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

function iPhoneXBlock({ id: blockId, video, image, rows }: { id?: string; video: any; image?: any; rows?: string }) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphonex-${blockId || 'x'}`
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 1405 / 2796; max-width: 100%; height: 480px; }
        @media (min-width: 810px) {
          #${id} { height: 600px; }
        }
        @media (min-width: 1280px) {
          #${id} { height: ${rowHeight}px; width: auto; }
        }
      ` }} />
      <div className="w-full h-full flex items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '6.2%', bottom: '6.5%', left: '10.1%', right: '9.7%', borderRadius: '5%' }}>
            {isVideo ? (
              <LazyVideo src={src} className="w-full h-full object-cover" />
            ) : (
              <img src={src} alt={image?.alt || ''} className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          <img src={IPHONEX_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

const blockComponents: Record<string, React.ComponentType<any>> = {
  text: TextBlock,
  image: ImageBlockComponent,
  video: VideoBlockComponent,
  dc1: DC1Block,
  iphone15: iPhone15Block,
  iphone13mini: iPhone13MiniBlock,
  iphone5: iPhone5Block,
  iphone6: iPhone6Block,
  iphonex: iPhoneXBlock,
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

  return (
    <div className="grid grid-cols-1 desktop:grid-cols-6 desktop:grid-flow-dense gap-5 tablet:gap-10 content-block-grid">
      {blocks.map((block, i) => {
        const Component = blockComponents[block.blockType]
        if (!Component) return null
        const cols = block.columns || '6'
        const rows = block.rows || '1'
        return (
          <div
            key={block.id || i}
            className={`${colSpan[cols] || 'desktop:col-span-6'} ${rows !== '1' ? (rowSpan[rows] || '') : ''} ${['dc1', 'iphone15', 'iphone13mini', 'iphone5', 'iphone6', 'iphonex'].includes(block.blockType) ? 'bg-background-alt p-5 tablet:p-8 desktop:p-10' : ''}`}
          >
            <div className={['dc1', 'iphone15', 'iphone13mini', 'iphone5', 'iphone6', 'iphonex'].includes(block.blockType) ? 'h-full flex items-center justify-center' : ''}>
              <Component {...block} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
