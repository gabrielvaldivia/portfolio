export type SheetDestination = 'partial' | 'full' | 'closed'

export function getSheetDestination(expanded: boolean, distance: number, velocity: number): SheetDestination {
  // Require an intentional movement; a tap or a small scroll wobble is not a swipe.
  if (distance > 64 || (distance > 12 && velocity > 500)) return 'closed'
  if (!expanded && (distance < -48 || (distance < -12 && velocity < -400))) return 'full'
  return expanded ? 'full' : 'partial'
}
