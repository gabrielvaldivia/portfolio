import type { ReactNode } from 'react'
import { Container } from './Container'
import { PayloadImage } from './PayloadImage'
import { RichText } from './RichText'

export type NoteArticleData = {
  title?: string | null
  body?: unknown
  createdAt?: string | null
  publishedAt?: string | null
  coverImage?: number | string | {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric',
})

export function NoteArticle({ note, bodyContent, children }: {
  note: NoteArticleData
  bodyContent?: ReactNode
  children?: ReactNode
}) {
  const coverImage = typeof note.coverImage === 'object' ? note.coverImage : null
  const date = new Date(note.publishedAt || note.createdAt || '')
  const noteDate = Number.isNaN(date.getTime()) ? null : dateFormatter.format(date)

  return (
    <article className="note-page pb-20 text-text-strong">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <header className="flex flex-col gap-4 pb-12 text-left tablet:pb-16 tablet:text-center">
            <h1 className="note-page-title">{note.title || 'Untitled note'}</h1>
            {noteDate ? <p className="text-[16px] text-text-muted tablet:text-[18px]">{noteDate}</p> : null}
          </header>
        </div>

        {coverImage?.url ? (
          <figure className="mb-12 overflow-hidden rounded-[16px] bg-background-alt tablet:mb-16">
            <PayloadImage
              media={coverImage}
              alt={coverImage.alt || ''}
              className="h-auto w-full"
              height={coverImage.height || 900}
              sizes="(max-width: 809px) calc(100vw - 40px), (max-width: 1479px) calc(100vw - 80px), 1400px"
              width={coverImage.width || 1600}
            />
          </figure>
        ) : null}

        <div className="longform-body mx-auto max-w-[760px]">
          {bodyContent ?? <RichText data={note.body} renderLinkedImages />}
        </div>
        {children}
      </Container>
    </article>
  )
}
