import { REGIONS, SYSTEMS } from './content'
import { Entry, latest, trend, mlabel, munit } from './store'

const UNITS: [RegExp, string][] = [
  [/x10\^(\d+)\/L/g, 'times 10 to the $1 per litre'], [/mmol\/24h/g, 'millimoles per 24 hours'], [/g\/cm2/g, 'grams per square centimetre'],
  [/% of own baseline/g, 'percent of your own baseline'], [/\bbpm\b/g, 'beats per minute'], [/%/g, ' percent'], [/[()]/g, ' '],
]
export const speakable = (t: string) => UNITS.reduce((s, [re, r]) => s.replace(re, r), t)

// Read aloud sentence by sentence (long single utterances can cut off in Chrome).
export function say(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  for (const part of speakable(text).split(/(?<=[.!?])\s+/)) {
    if (!part.trim()) continue
    const u = new SpeechSynthesisUtterance(part); u.lang = 'en-US'
    speechSynthesis.speak(u)
  }
}
export const stopSaying = () => { if ('speechSynthesis' in window) speechSynthesis.cancel() }

export function describe(p: { id: string; side?: string }, si: number, entries: Entry[]): string {
  const reg = REGIONS[p.id]
  const S = SYSTEMS[reg.systems[si]]
  const meas = S.metrics.map((k) => {
    const l = latest(entries, k), t = trend(entries, k)
    if (!l) return `No ${mlabel(k)} logged yet.`
    return `Your latest ${mlabel(k)} is ${l.value} ${munit(k)} on day ${l.day}${l.sim ? ', simulated data' : ''}.${t ? ` It has been ${t.dir} about ${Math.abs(t.pct)} percent over the last ${t.n} entries.` : ''}`
  }).join(' ')
  const name = `${p.side ? p.side + ' ' : ''}${reg.label.toLowerCase()}`
  return `${name}. ${si === 0 ? `Structures: ${reg.structures}. ` : ''}${S.label} system. Function: ${S.fn} Possible spaceflight effects: ${S.effects} ${meas} Warning indicators: ${S.warn}`
}
