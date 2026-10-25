'use client'

import type { DefaultCellComponentProps } from 'payload'

// Formats on the client so the date follows the editor's time zone, like the date picker.
export function ShortDateCell({ cellData }: DefaultCellComponentProps) {
  if (!cellData) return null
  const date = new Date(cellData as string)
  if (Number.isNaN(date.getTime())) return null
  return <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
}
