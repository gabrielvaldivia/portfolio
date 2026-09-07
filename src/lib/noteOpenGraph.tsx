import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const NOTE_OG_SIZE = { width: 1200, height: 630 }

// ImageResponse cannot read CSS variables. These match the site's dark text
// tokens and Inter Display heading styling.
export const NOTE_OG_STYLE = {
  background: '#000',
  strong: '#fff',
  muted: 'rgba(255, 255, 255, 0.6)',
  fontFamily: 'Inter Display',
  fontWeight: 400 as const,
  titleSize: 100,
  titleLineHeight: 1.1,
  titleTracking: '-0.04em',
  bylineSize: 64,
  bylineLineHeight: 1.15,
  bylineTracking: '-0.02em',
  padding: 120,
  gap: 24,
}

let font: Promise<Buffer> | undefined

export function createNoteOpenGraphImage(title: string) {
  font ??= readFile(join(process.cwd(), 'assets/fonts/InterDisplay-Regular.ttf'))
  return font.then(fontData => new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: NOTE_OG_STYLE.gap,
        width: '100%',
        height: '100%',
        padding: NOTE_OG_STYLE.padding,
        background: NOTE_OG_STYLE.background,
        color: NOTE_OG_STYLE.strong,
        fontFamily: NOTE_OG_STYLE.fontFamily,
        fontWeight: NOTE_OG_STYLE.fontWeight,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          width: '100%',
          textAlign: 'center',
          color: NOTE_OG_STYLE.muted,
          fontSize: NOTE_OG_STYLE.bylineSize,
          lineHeight: NOTE_OG_STYLE.bylineLineHeight,
          letterSpacing: NOTE_OG_STYLE.bylineTracking,
        }}
      >
        Gabriel Valdivia
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          textAlign: 'center',
          fontSize: title.length > 140 ? 48 : title.length > 90 ? 64 : title.length > 56 ? 80 : NOTE_OG_STYLE.titleSize,
          lineHeight: NOTE_OG_STYLE.titleLineHeight,
          letterSpacing: NOTE_OG_STYLE.titleTracking,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          maxHeight: 292,
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
    </div>,
    {
      ...NOTE_OG_SIZE,
      fonts: [{ name: NOTE_OG_STYLE.fontFamily, data: fontData, weight: 400, style: 'normal' }],
    },
  ))
}
