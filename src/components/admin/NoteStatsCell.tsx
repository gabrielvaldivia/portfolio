'use client'

import type { DefaultCellComponentProps } from 'payload'

export function CountCell({ cellData }: DefaultCellComponentProps) {
  return <span>{(Number(cellData) || 0).toLocaleString('en-US')}</span>
}
