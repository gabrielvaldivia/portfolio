'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useMemo, useState } from 'react'

import {
  DEFAULT_TIMELINE_CHAPTERS,
  TIMELINE_CHAPTER_COUNT,
  type TimelineChapter,
} from '@/data/timelineContent'

import styles from './TimelineEditor.module.css'

function editableChapters(value: unknown): TimelineChapter[] {
  if (!Array.isArray(value) || value.length !== TIMELINE_CHAPTER_COUNT) {
    return DEFAULT_TIMELINE_CHAPTERS.map((chapter) => ({
      paragraphs: [...chapter.paragraphs],
      title: chapter.title,
    }))
  }

  return value.map((chapter, index) => {
    const fallback = DEFAULT_TIMELINE_CHAPTERS[index]
    if (!chapter || typeof chapter !== 'object') {
      return { paragraphs: [...fallback.paragraphs], title: fallback.title }
    }

    const candidate = chapter as Partial<TimelineChapter>
    return {
      paragraphs: Array.isArray(candidate.paragraphs)
        ? candidate.paragraphs.map((paragraph) =>
            typeof paragraph === 'string' ? paragraph : '',
          )
        : [...fallback.paragraphs],
      title: typeof candidate.title === 'string' ? candidate.title : fallback.title,
    }
  })
}

export const TimelineEditor: JSONFieldClientComponent = ({ field, path: pathFromProps, readOnly }) => {
  const [openChapters, setOpenChapters] = useState(() => new Set([0]))
  const {
    disabled,
    errorMessage,
    initialValue,
    path,
    setValue,
    showError,
    value,
  } = useField<unknown>({ potentiallyStalePath: pathFromProps })
  const chapters = useMemo(
    () => editableChapters(value ?? initialValue),
    [initialValue, value],
  )
  const locked = Boolean(readOnly || disabled)

  const updateChapter = (
    chapterIndex: number,
    update: (chapter: TimelineChapter) => TimelineChapter,
  ) => {
    const next = chapters.map((chapter, index) =>
      index === chapterIndex ? update(chapter) : chapter,
    )
    setValue(next)
  }

  const updateParagraph = (chapterIndex: number, paragraphIndex: number, paragraph: string) => {
    updateChapter(chapterIndex, (chapter) => ({
      ...chapter,
      paragraphs: chapter.paragraphs.map((current, index) =>
        index === paragraphIndex ? paragraph : current,
      ),
    }))
  }

  const moveParagraph = (chapterIndex: number, paragraphIndex: number, direction: -1 | 1) => {
    updateChapter(chapterIndex, (chapter) => {
      const targetIndex = paragraphIndex + direction
      if (targetIndex < 0 || targetIndex >= chapter.paragraphs.length) return chapter

      const paragraphs = [...chapter.paragraphs]
      ;[paragraphs[paragraphIndex], paragraphs[targetIndex]] = [
        paragraphs[targetIndex],
        paragraphs[paragraphIndex],
      ]
      return { ...chapter, paragraphs }
    })
  }

  return (
    <div className={styles.field}>
      <FieldLabel
        label={field.label}
        localized={field.localized}
        path={path}
        required={field.required}
      />
      <FieldError message={errorMessage} path={path} showError={showError} />
      <FieldDescription description={field.admin?.description} path={path} />

      <div className={styles.chapters}>
        {chapters.map((chapter, chapterIndex) => {
          const chapterLabel = chapterIndex === 0 ? 'Prologue' : `Chapter ${chapterIndex}`

          return (
            <details
              className={styles.chapter}
              key={chapterIndex}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open
                setOpenChapters((current) => {
                  if (current.has(chapterIndex) === isOpen) return current
                  const next = new Set(current)
                  if (isOpen) next.add(chapterIndex)
                  else next.delete(chapterIndex)
                  return next
                })
              }}
              open={openChapters.has(chapterIndex)}
            >
              <summary className={styles.summary}>
                <span className={styles.chapterNumber}>{chapterLabel}</span>
                <span className={styles.chapterTitle}>{chapter.title || 'Untitled'}</span>
              </summary>

              <div className={styles.chapterBody}>
                <label className={styles.label}>
                  <span>Title</span>
                  <input
                    className={styles.input}
                    disabled={locked}
                    onChange={(event) =>
                      updateChapter(chapterIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    type="text"
                    value={chapter.title}
                  />
                </label>

                <div className={styles.paragraphs}>
                  {chapter.paragraphs.map((paragraph, paragraphIndex) => (
                    <div className={styles.paragraph} key={paragraphIndex}>
                      <div className={styles.paragraphHeader}>
                        <span>Paragraph {paragraphIndex + 1}</span>
                        <span className={styles.actions}>
                          <button
                            aria-label={`Move paragraph ${paragraphIndex + 1} up`}
                            className={styles.action}
                            disabled={locked || paragraphIndex === 0}
                            onClick={() => moveParagraph(chapterIndex, paragraphIndex, -1)}
                            type="button"
                          >
                            Up
                          </button>
                          <button
                            aria-label={`Move paragraph ${paragraphIndex + 1} down`}
                            className={styles.action}
                            disabled={locked || paragraphIndex === chapter.paragraphs.length - 1}
                            onClick={() => moveParagraph(chapterIndex, paragraphIndex, 1)}
                            type="button"
                          >
                            Down
                          </button>
                          <button
                            aria-label={`Remove paragraph ${paragraphIndex + 1}`}
                            className={styles.action}
                            disabled={locked || chapter.paragraphs.length === 1}
                            onClick={() =>
                              updateChapter(chapterIndex, (current) => ({
                                ...current,
                                paragraphs: current.paragraphs.filter(
                                  (_, index) => index !== paragraphIndex,
                                ),
                              }))
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </span>
                      </div>
                      <textarea
                        className={styles.textarea}
                        disabled={locked}
                        onChange={(event) =>
                          updateParagraph(chapterIndex, paragraphIndex, event.target.value)
                        }
                        rows={7}
                        value={paragraph}
                      />
                    </div>
                  ))}
                </div>

                <button
                  className={styles.addButton}
                  disabled={locked}
                  onClick={() =>
                    updateChapter(chapterIndex, (current) => ({
                      ...current,
                      paragraphs: [...current.paragraphs, ''],
                    }))
                  }
                  type="button"
                >
                  Add paragraph
                </button>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
