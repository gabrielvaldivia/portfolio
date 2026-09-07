import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const NOTE_OG_SIZE = { width: 1200, height: 630 }

// ImageResponse cannot read CSS variables. These match the site's dark text
// tokens and Inter Display heading styling, with a larger social-card byline.
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
}

let font: Promise<Buffer> | undefined

export function createNoteOpenGraphImage(title: string) {
  font ??= readFile(join(process.cwd(), 'assets/fonts/InterDisplay-Regular.ttf'))
  return font.then(fontData => new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 60,
        background: NOTE_OG_STYLE.background,
        color: NOTE_OG_STYLE.strong,
        fontFamily: NOTE_OG_STYLE.fontFamily,
        fontWeight: NOTE_OG_STYLE.fontWeight,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: title.length > 120 ? 64 : title.length > 72 ? 80 : NOTE_OG_STYLE.titleSize,
          lineHeight: NOTE_OG_STYLE.titleLineHeight,
          letterSpacing: NOTE_OG_STYLE.titleTracking,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          maxHeight: 396,
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          color: NOTE_OG_STYLE.muted,
          fontSize: NOTE_OG_STYLE.bylineSize,
          lineHeight: NOTE_OG_STYLE.bylineLineHeight,
          letterSpacing: NOTE_OG_STYLE.bylineTracking,
        }}
      >
        By Gabriel Valdivia
      </div>
    </div>,
    {
      ...NOTE_OG_SIZE,
      fonts: [{ name: NOTE_OG_STYLE.fontFamily, data: fontData, weight: 400, style: 'normal' }],
    },
  ))
}
