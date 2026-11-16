/**
 * Deal items, already sorted by likes, into two rows: top, bottom, top, bottom.
 * Each pick takes the highest-ranked item whose project differs from the card
 * before it in the same row and the card just placed in the other row, so one
 * project never clusters. If every remaining item conflicts, rank wins.
 */
export function splitIntoAlternatingRows<T>(
  items: T[],
  getProject: (item: T) => string,
): [T[], T[]] {
  const rows: [T[], T[]] = [[], []]
  const remaining = [...items]
  const picked: T[] = []

  while (remaining.length) {
    const avoid = new Set(picked.slice(-2).map(getProject))
    const index = remaining.findIndex((item) => !avoid.has(getProject(item)))
    const [item] = remaining.splice(index === -1 ? 0 : index, 1)
    rows[picked.length % 2].push(item)
    picked.push(item)
  }

  return rows
}
