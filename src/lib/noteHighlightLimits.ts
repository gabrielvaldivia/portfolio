export const MAX_READER_HIGHLIGHTS = 5
export const MAX_HIGHLIGHT_COVERAGE = 0.15

/** Count overlapping text once, using the same UTF-16 offsets as note anchors. */
export function highlightCoverage(ranges: readonly { start: number; end: number }[]) {
  let covered = 0
  let end = 0
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    covered += Math.max(0, range.end - Math.max(end, range.start))
    end = Math.max(end, range.end)
  }
  return covered
}
