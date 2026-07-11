import Image from 'next/image'
import { LazyVideo } from '@/components/LazyVideo'
import { LightboxVideo } from '@/components/LightboxVideo'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { VideoPlayer } from '@/components/VideoPlayer'
import { cn } from '@/lib/cn'

type ModuleRenderMode = 'page' | 'lightbox'

type ModuleRenderProps = {
  _active?: boolean
  _containedInLightbox?: boolean
  _lightboxAspectRatio?: number
  _likeTargetId?: string | null
  _mode?: ModuleRenderMode
  _sourceContentWidth?: number
}

const bgColorMap: Record<string, string> = {
  alt: 'bg-background-alt',
  background: 'bg-background',
  elevated: 'bg-elevated',
  none: '',
  custom: '',
}

const paddingClasses: Record<string, string> = {
  '10': 'p-2 tablet:p-2.5',
  '20': 'p-3 tablet:p-5',
  '40': 'p-5 tablet:p-8 desktop:p-10',
  '60': 'p-6 tablet:p-10 desktop:p-[60px]',
  '80': 'p-8 tablet:p-12 desktop:p-20',
}

const ROW_HEIGHT = 200
const ROW_GAP = 40
const VIDEO_LIGHTBOX_VERTICAL_OFFSET = 72

export function ModuleLikeOverlay({ targetId }: { targetId: string }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 opacity-100 transition-opacity duration-150 desktop:opacity-0 desktop:group-hover/module:opacity-100 desktop:group-focus-within/module:opacity-100">
      <LazyModuleLikeButton targetId={targetId} />
    </div>
  )
}

function isChecked(value: unknown) {
  return value === true || value === 'true' || value === 1
}

function getConstrainedWidth(aspectRatio: number, verticalOffset = 132) {
  return `min(100%, calc((100dvh - ${verticalOffset}px) * ${aspectRatio}))`
}

function getRowHeight(rows?: string) {
  const isWrap = !rows || rows === 'wrap'
  const rowCount = isWrap ? 0 : parseInt(rows, 10)
  return rowCount > 0 ? ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1) : null
}

function getSurfaceBackground(bgColor?: string) {
  const isPreset = bgColor && bgColor in bgColorMap
  return {
    bg: isPreset ? bgColorMap[bgColor] : (bgColor ? '' : 'bg-background-alt'),
    customBg: !isPreset && bgColor ? bgColor : undefined,
  }
}

function getValidAspectRatio(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

export function ImageBlockComponent({
  image,
  caption,
  border,
  imageBorder,
  rounded,
  shadow,
  columns,
  rows,
  fit,
  bgColor,
  padding,
  _lightboxAspectRatio,
  _likeTargetId,
  _mode = 'page',
}: {
  image: any
  caption?: string
  border?: boolean
  imageBorder?: boolean
  rounded?: boolean
  shadow?: boolean
  columns?: string
  rows?: string
  height?: number
  maxHeight?: number
  fit?: string
  bgColor?: string
  padding?: string | number
} & ModuleRenderProps) {
  if (!image?.url) return null
  const imageAspectRatio = image.width && image.height ? image.width / image.height : 16 / 9
  const isLightbox = _mode === 'lightbox'
  const aspectRatio = isLightbox
    ? getValidAspectRatio(_lightboxAspectRatio) || imageAspectRatio
    : imageAspectRatio
  const { bg, customBg } = getSurfaceBackground(bgColor)
  const padStr = String(padding || '0')
  const padClass = paddingClasses[padStr] || ''
  const hasPadding = padStr !== '0' && padClass
  const rowHeight = getRowHeight(rows)
  const roundedClass = rounded ? 'rounded-lg tablet:rounded-xl desktop:rounded-2xl' : ''
  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <div className={cn(isLightbox ? 'mx-auto w-full' : '')} style={isLightbox ? { width: getConstrainedWidth(aspectRatio) } : undefined}>
      <div
        className={`${bg} w-full relative ${hasPadding ? padClass : ''} ${!hasPadding ? 'overflow-hidden' : ''}`}
        style={{
          ...(customBg ? { backgroundColor: customBg } : {}),
        }}
      >
        <div
          className={`relative w-full ${shadow ? 'drop-shadow-md' : ''} ${roundedClass}`}
          style={{ aspectRatio, ...(rowHeight && !isLightbox ? { ['--row-height' as string]: `${rowHeight}px` } : {}) }}
        >
          <div className={`absolute inset-0 ${roundedClass} ${rounded || imageBorder ? 'overflow-hidden' : ''}`}>
            <Image src={image.url} alt={image.alt || ''} fill className={objectFit} sizes={isLightbox ? '100vw' : columns === '1' ? '16vw' : columns === '2' ? '33vw' : columns === '3' ? '50vw' : columns === '4' ? '66vw' : '100vw'} />
            {imageBorder && <div className={`absolute inset-0 z-10 pointer-events-none border border-border ${roundedClass}`} />}
          </div>
        </div>
        {border && <div className="absolute inset-0 z-10 ring-1 ring-inset ring-black/10 dark:ring-white/10 pointer-events-none" />}
        {_likeTargetId && <ModuleLikeOverlay targetId={_likeTargetId} />}
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

export function VideoBlockComponent({
  video,
  url,
  caption,
  rows,
  fit,
  bgColor,
  padding,
  border,
  loop = true,
  muted = true,
  controls = false,
  _active,
  _lightboxAspectRatio,
  _likeTargetId,
  _mode = 'page',
}: any) {
  const src = video?.url || url
  if (!src) return null
  const rowHeight = getRowHeight(rows)
  const { bg, customBg } = getSurfaceBackground(bgColor)
  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover'
  const padStr = String(padding || '0')
  const padClass = paddingClasses[padStr] || ''
  const hasPadding = padStr !== '0' && padClass
  const isLightbox = _mode === 'lightbox'
  const videoWidth = Number(video?.width)
  const videoHeight = Number(video?.height)
  const videoAspectRatio = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : undefined
  const lightboxAspectRatio = typeof _lightboxAspectRatio === 'number' && Number.isFinite(_lightboxAspectRatio) && _lightboxAspectRatio > 0
    ? _lightboxAspectRatio
    : videoAspectRatio

  if (isLightbox) {
    return (
      <div
        className={cn(
          'mx-auto flex max-h-[calc(100dvh-72px)] w-full items-center justify-center',
          lightboxAspectRatio ? '' : 'max-w-[min(1440px,calc(100dvw-32px))]',
        )}
        style={lightboxAspectRatio ? { width: getConstrainedWidth(lightboxAspectRatio, VIDEO_LIGHTBOX_VERTICAL_OFFSET) } : undefined}
      >
        <LightboxVideo
          src={src}
          active={_active}
          aspectRatio={lightboxAspectRatio}
          className={cn(
            lightboxAspectRatio ? 'h-auto max-h-[calc(100dvh-72px)] w-full max-w-full' : 'h-auto max-h-[calc(100dvh-72px)] w-auto max-w-full',
            fit === 'cover' ? 'object-cover' : 'object-contain',
          )}
        />
      </div>
    )
  }

  return (
    <div>
      <div
        className={cn(bg, 'relative overflow-hidden', border ? 'border border-border' : '', hasPadding ? padClass : '')}
        style={{
          ...(rowHeight ? { ['--row-height' as string]: `${rowHeight}px` } : {}),
          ...(customBg ? { backgroundColor: customBg } : {}),
        }}
      >
        <VideoPlayer src={src} loop={loop} muted={muted} controls={controls} className={`w-full h-full ${objectFit}`} />
        {_likeTargetId && <ModuleLikeOverlay targetId={_likeTargetId} />}
      </div>
      {caption && <p className="text-muted text-caption" style={{ marginTop: 10 }}>{caption}</p>}
    </div>
  )
}

export function BrowserBlockComponent({
  image,
  caption,
  columns,
  fit,
  imageBorder,
  shadow,
  _likeTargetId,
  _containedInLightbox,
  _mode = 'page',
  _sourceContentWidth,
}: {
  image: any
  address?: string
  caption?: string
  rows?: string
  columns?: string
  fit?: string
  bgColor?: string
  padding?: string | number
  imageBorder?: boolean
  shadow?: boolean
} & ModuleRenderProps) {
  if (!image?.url) return null

  const aspectRatio = image.width && image.height ? image.width / image.height : 16 / 9
  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover'
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && _containedInLightbox
  const scaledLength = (pixels: number) => isContainedLightbox && _sourceContentWidth
    ? `${(pixels / _sourceContentWidth) * 100}cqw`
    : undefined
  const scaledToolbarPadding = isContainedLightbox && _sourceContentWidth
    ? `${scaledLength(8)} ${scaledLength(16)}`
    : undefined

  return (
    <div className={cn('w-full', isLightbox ? 'mx-auto' : '')} style={isLightbox && !isContainedLightbox ? { width: getConstrainedWidth(aspectRatio) } : undefined}>
      <div className={cn('relative w-full', isLightbox && !isContainedLightbox ? 'bg-background-alt p-5 tablet:p-8 desktop:p-10' : '')}>
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-md',
            shadow ? 'shadow-lg' : '',
          )}
          style={{ borderRadius: scaledLength(16), borderWidth: scaledLength(1) }}
        >
          <div
            className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border bg-gray-200 px-3 py-2 tablet:min-h-12 tablet:gap-3 tablet:px-4"
            style={{
              minHeight: scaledLength(48),
              gap: scaledLength(12),
              padding: scaledToolbarPadding,
              borderBottomWidth: scaledLength(1),
            }}
          >
            <div className="flex w-14 shrink-0 items-center gap-2 tablet:w-16" style={{ width: scaledLength(64), gap: scaledLength(8) }} aria-hidden="true">
              <span className="size-3 rounded-full bg-red-400 tablet:size-3.5" style={{ width: scaledLength(14), height: scaledLength(14) }} />
              <span className="size-3 rounded-full bg-yellow-400 tablet:size-3.5" style={{ width: scaledLength(14), height: scaledLength(14) }} />
              <span className="size-3 rounded-full bg-green-400 tablet:size-3.5" style={{ width: scaledLength(14), height: scaledLength(14) }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mx-auto h-6 max-w-sm rounded-full bg-white tablet:h-7" style={{ height: scaledLength(28), maxWidth: scaledLength(384) }} aria-hidden="true" />
            </div>
            <div className="w-14 shrink-0 tablet:w-16" style={{ width: scaledLength(64) }} aria-hidden="true" />
          </div>
          <div className="relative bg-background" style={{ aspectRatio }}>
            <Image src={image.url} alt={image.alt || ''} fill className={objectFit} sizes={isLightbox ? '100vw' : columns === '1' ? '16vw' : columns === '2' ? '33vw' : columns === '3' ? '50vw' : columns === '4' ? '66vw' : '100vw'} />
            {imageBorder && <div className="pointer-events-none absolute inset-0 z-10 border border-border" />}
          </div>
        </div>
        {_likeTargetId && <ModuleLikeOverlay targetId={_likeTargetId} />}
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

function lightboxFrameSizeStyle(aspectRatio: number) {
  const verticalMargin = 72
  const horizontalMargin = 32
  const widthFromViewportHeight = (aspectRatio * 100).toFixed(4)
  const widthMarginOffset = (aspectRatio * verticalMargin).toFixed(2)

  return `width: min(calc(100dvw - ${horizontalMargin}px), calc(${widthFromViewportHeight}dvh - ${widthMarginOffset}px)); height: auto; max-width: 100%;`
}

function framedLightboxSizeStyle(aspectRatio: number, contained: boolean) {
  return contained
    ? `width: min(100%, calc(100cqh * ${aspectRatio})); height: auto; max-width: 100%; max-height: 100%;`
    : lightboxFrameSizeStyle(aspectRatio)
}

function framedHeightStyle(isLightbox: boolean, rowHeight: number, aspectRatio: number, contained = false) {
  return isLightbox
    ? framedLightboxSizeStyle(aspectRatio, contained)
    : `height: ${rowHeight}px; width: auto;`
}

function FramedVideoOrImage({
  src,
  isVideo,
  alt,
  active,
  mode,
}: {
  src: string
  isVideo?: boolean
  alt?: string
  active?: boolean
  mode: ModuleRenderMode
}) {
  if (isVideo) {
    return <LazyVideo src={src} className="w-full h-full object-cover" />
  }

  return <img src={src} alt={alt || ''} className="w-full h-full object-cover" loading="lazy" />
}

export function DC1Block({ id: blockId, video, rows, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; rows?: string } & ModuleRenderProps) {
  const src = video?.url
  if (!src) return null
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `dc1-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 718 / 960
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 718 / 960; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'width: 100%;'} }
        @media (min-width: 1280px) {
          #${id} { aspect-ratio: 718 / 960; ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div id={id} className="relative mx-auto overflow-hidden">
        <div className="absolute inset-[6%] z-0">
          <FramedVideoOrImage src={src} isVideo active={_active} mode={_mode} />
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

export function iPhone15Block({ id: blockId, video, image, rows, showNotch, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; image?: any; rows?: string; showNotch?: boolean | string | number } & ModuleRenderProps) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone15-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const frameUrl = isChecked(showNotch) ? IPHONE15_NOTCH_FRAME_URL : IPHONE15_FRAME_URL
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 2005 / 4096
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 2005 / 4096; max-width: 100%; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 480px;'} }
        @media (min-width: 810px) {
          #${id} { ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 600px;'} }
        }
        @media (min-width: 1280px) {
          #${id} { ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div className="flex h-full max-w-full items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div
            className="absolute z-0 overflow-hidden bg-black"
            style={{
              top: '2.1%',
              bottom: '2.0%',
              left: '4.9%',
              right: '4.9%',
              borderRadius: '10% / 5%',
              boxShadow: '0 0 0 6px #000',
            }}
          >
            <FramedVideoOrImage src={src} isVideo={isVideo} alt={image?.alt} active={_active} mode={_mode} />
          </div>
          <img
            src={frameUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy"
          />
        </div>
      </div>
    </>
  )
}

export function iPhone13MiniBlock({ id: blockId, video, image, rows, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; image?: any; rows?: string } & ModuleRenderProps) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone13mini-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 553 / 1024
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 553 / 1024; max-width: 100%; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 480px;'} }
        @media (min-width: 810px) {
          #${id} { ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 600px;'} }
        }
        @media (min-width: 1280px) {
          #${id} { ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div className="flex h-full max-w-full items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '7.3%', bottom: '7.2%', left: '13.5%', right: '13.5%', borderRadius: '5%' }}>
            <FramedVideoOrImage src={src} isVideo={isVideo} alt={image?.alt} active={_active} mode={_mode} />
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

export function iPhone5Block({ id: blockId, video, image, rows, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; image?: any; rows?: string } & ModuleRenderProps) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone5-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 762 / 1597
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 762 / 1597; max-width: 100%; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 480px;'} }
        @media (min-width: 810px) {
          #${id} { ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 600px;'} }
        }
        @media (min-width: 1280px) {
          #${id} { ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div className="flex h-full max-w-full items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '14.3%', bottom: '13.7%', left: '8.2%', right: '6.9%' }}>
            <FramedVideoOrImage src={src} isVideo={isVideo} alt={image?.alt} active={_active} mode={_mode} />
          </div>
          <img src={IPHONE5_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

export function iPhone6Block({ id: blockId, video, image, rows, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; image?: any; rows?: string } & ModuleRenderProps) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphone6-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 990 / 1934
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 990 / 1934; max-width: 100%; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 480px;'} }
        @media (min-width: 810px) {
          #${id} { ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 600px;'} }
        }
        @media (min-width: 1280px) {
          #${id} { ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div className="flex h-full max-w-full items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '15.4%', bottom: '15.6%', left: '12.2%', right: '11.7%' }}>
            <FramedVideoOrImage src={src} isVideo={isVideo} alt={image?.alt} active={_active} mode={_mode} />
          </div>
          <img src={IPHONE6_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

export function iPhoneXBlock({ id: blockId, video, image, rows, _active, _containedInLightbox, _mode = 'page' }: { id?: string; video: any; image?: any; rows?: string } & ModuleRenderProps) {
  const src = video?.url || image?.url
  if (!src) return null
  const isVideo = !!video?.url
  const rowCount = parseInt(rows || '1', 10)
  const rowHeight = ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1)
  const id = `iphonex-${blockId || 'x'}${_mode === 'lightbox' ? '-lightbox' : ''}`
  const isLightbox = _mode === 'lightbox'
  const isContainedLightbox = isLightbox && Boolean(_containedInLightbox)
  const aspectRatio = 1405 / 2796
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #${id} { aspect-ratio: 1405 / 2796; max-width: 100%; ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 480px;'} }
        @media (min-width: 810px) {
          #${id} { ${isLightbox ? framedLightboxSizeStyle(aspectRatio, isContainedLightbox) : 'height: 600px;'} }
        }
        @media (min-width: 1280px) {
          #${id} { ${framedHeightStyle(isLightbox, rowHeight, aspectRatio, isContainedLightbox)} }
        }
      ` }} />
      <div className="flex h-full max-w-full items-center justify-center">
        <div id={id} className="relative overflow-hidden">
          <div className="absolute z-0 overflow-hidden" style={{ top: '6.2%', bottom: '6.5%', left: '10.1%', right: '9.7%', borderRadius: '5%' }}>
            <FramedVideoOrImage src={src} isVideo={isVideo} alt={image?.alt} active={_active} mode={_mode} />
          </div>
          <img src={IPHONEX_FRAME_URL} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" loading="lazy" />
        </div>
      </div>
    </>
  )
}

export const mediaBlockComponents: Record<string, React.ComponentType<any>> = {
  browser: BrowserBlockComponent,
  image: ImageBlockComponent,
  video: VideoBlockComponent,
  dc1: DC1Block,
  iphone15: iPhone15Block,
  iphone13mini: iPhone13MiniBlock,
  iphone5: iPhone5Block,
  iphone6: iPhone6Block,
  iphonex: iPhoneXBlock,
  fullWidthImage: ({ image, border, ...props }: any) => <ImageBlockComponent image={image} border={border} {...props} />,
  fullWidthVideo: VideoBlockComponent,
  deviceMockup: ({ image, ...props }: any) => <ImageBlockComponent image={image} {...props} />,
}

export const framedBlockTypes = ['browser', 'dc1', 'iphone15', 'iphone13mini', 'iphone5', 'iphone6', 'iphonex']
export const phoneFrameBlockTypes = ['dc1', 'iphone15', 'iphone13mini', 'iphone5', 'iphone6', 'iphonex']
export const internalLikeButtonBlockTypes = ['image', 'video', 'fullWidthImage', 'fullWidthVideo']
export const lightboxableBlockTypes = [...Object.keys(mediaBlockComponents), 'imageGrid']
