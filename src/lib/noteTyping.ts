// The first visit to each note types its body out. Later visits, reduced
// motion, crawlers and browsers without the CSS Custom Highlight API get the
// full text at once. The text never leaves the server-rendered DOM: typing
// only paints untyped characters transparent.

export const NOTE_TYPING_STORAGE_KEY = 'seen-notes'
export const NOTE_TYPING_ATTRIBUTE = 'data-note-typing'
const MAX_REMEMBERED_NOTES = 300
const BOT_PATTERN = 'bot|crawl|spider|slurp|headless|lighthouse|preview'

function readSeen(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NOTE_TYPING_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((slug): slug is string => typeof slug === 'string') : []
  } catch {
    return []
  }
}

export function shouldTypeNote(slug: string) {
  try {
    if (window.location.hash) return false
    if (new RegExp(BOT_PATTERN, 'i').test(navigator.userAgent)) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (typeof CSS === 'undefined' || !('highlights' in CSS) || typeof Highlight === 'undefined') return false
    localStorage.setItem(`${NOTE_TYPING_STORAGE_KEY}-probe`, '1')
    localStorage.removeItem(`${NOTE_TYPING_STORAGE_KEY}-probe`)
    return !readSeen().includes(slug)
  } catch {
    return false
  }
}

export function markNoteSeen(slug: string) {
  try {
    const seen = readSeen().filter((entry) => entry !== slug)
    seen.push(slug)
    localStorage.setItem(NOTE_TYPING_STORAGE_KEY, JSON.stringify(seen.slice(-MAX_REMEMBERED_NOTES)))
  } catch {
    // Storage can be blocked; the note simply types again next time.
  }
}

// Runs in <head> before the first paint of a full page load so an unseen note
// doesn't flash its full text before hydration. It mirrors shouldTypeNote; a
// CSS fallback reveals the text if the client component never takes over.
export const noteTypingHeadScript = `(function(){try{var m=location.pathname.match(/^\\/notes\\/([^/]+)\\/?$/);if(!m||location.hash)return;var s=decodeURIComponent(m[1]);if(/${BOT_PATTERN}/i.test(navigator.userAgent))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(typeof CSS==='undefined'||!('highlights' in CSS)||typeof Highlight==='undefined')return;var seen=JSON.parse(localStorage.getItem('${NOTE_TYPING_STORAGE_KEY}')||'[]');if(Array.isArray(seen)&&seen.indexOf(s)>-1)return;document.documentElement.setAttribute('${NOTE_TYPING_ATTRIBUTE}',s)}catch(e){}})()`

const BASE_DELAY = 30
const MAX_DURATION = 8000

// Natural time (ms) at which each character appears, with small jitter and
// pauses after punctuation and between blocks.
export function buildTypingSchedule(text: string, blockBreaks: Set<number>) {
  const times = new Float64Array(text.length)
  let time = 0
  for (let index = 0; index < text.length; index += 1) {
    times[index] = time
    const char = text[index]
    let delay = BASE_DELAY * (0.6 + Math.random() * 0.8)
    if (char === ' ') delay *= 0.7
    else if (/[.!?]/.test(char)) delay += 180
    else if (/[,;:]/.test(char)) delay += 70
    if (blockBreaks.has(index + 1)) delay += 220
    time += delay
  }
  return { times, total: time }
}

// Maps elapsed real time to natural typing time. Short notes play at natural
// speed; long ones start natural and accelerate so they finish within the cap.
export function warpTypingTime(elapsed: number, total: number) {
  const duration = Math.min(total, MAX_DURATION)
  if (elapsed >= duration) return Infinity
  const factor = total / duration
  return elapsed + (factor - 1) * duration * (elapsed / duration) ** 3
}
