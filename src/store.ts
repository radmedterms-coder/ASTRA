import { useSyncExternalStore } from 'react'

export type SysKey = 'skeletal' | 'muscular' | 'cardiovascular' | 'nervous' | 'respiratory' | 'hematological'
export type MetricKey = 'hr' | 'spo2' | 'rbc' | 'wbc' | 'ucal' | 'sleep' | 'muscle' | 'bone'

// min/max are plausibility limits for input validation only. They are NOT clinical reference ranges.
export const METRICS: { key: MetricKey; label: string; unit: string; min: number; max: number; system: SysKey }[] = [
  { key: 'hr', label: 'Heart rate', unit: 'bpm', min: 20, max: 250, system: 'cardiovascular' },
  { key: 'spo2', label: 'Blood oxygen saturation', unit: '%', min: 50, max: 100, system: 'respiratory' },
  { key: 'rbc', label: 'Red blood cell count', unit: 'x10^12/L', min: 0.5, max: 10, system: 'hematological' },
  { key: 'wbc', label: 'White blood cell count', unit: 'x10^9/L', min: 0.5, max: 60, system: 'hematological' },
  { key: 'ucal', label: 'Urinary calcium (24 h)', unit: 'mmol/24h', min: 0, max: 40, system: 'skeletal' },
  { key: 'sleep', label: 'Sleep duration', unit: 'hours', min: 0, max: 24, system: 'nervous' },
  { key: 'muscle', label: 'Muscle strength assessment', unit: '% of own baseline', min: 1, max: 250, system: 'muscular' },
  { key: 'bone', label: 'Bone density assessment', unit: 'g/cm2', min: 0.1, max: 3, system: 'skeletal' },
]
export const mlabel = (k: string) => METRICS.find((m) => m.key === k)?.label ?? k
export const munit = (k: string) => METRICS.find((m) => m.key === k)?.unit ?? ''

export interface Entry { id: string; day: number; key: MetricKey | 'symptom'; value: number; note?: string; region?: string; sim?: boolean }
export interface State { profile: { callsign: string; day: number } | null; entries: Entry[]; demo: boolean; threshold?: number }

const KEY = 'astra.v1'
function load(): State {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
  return { profile: null, entries: [], demo: false }
}
let state: State = load()
const subs = new Set<() => void>()
export function update(fn: (s: State) => State) {
  state = fn(state)
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full or blocked */ }
  subs.forEach((f) => f())
}
export const getThreshold = () => state.threshold ?? 5
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)

export const series = (e: Entry[], k: string) => e.filter((x) => x.key === k).sort((a, b) => a.day - b.day)
export const latest = (e: Entry[], k: string) => { const s = series(e, k); return s.length ? s[s.length - 1] : null }

// Prototype descriptive rule (NOT a clinical threshold): last 3-4 entries move in one direction by >= threshold % (default 5, adjustable in Settings).
export function trend(e: Entry[], k: MetricKey) {
  const s = series(e, k).slice(-4)
  if (s.length < 3 || s[0].value === 0) return null
  const d = s.slice(1).map((x, i) => x.value - s[i].value)
  const pct = ((s[s.length - 1].value - s[0].value) / Math.abs(s[0].value)) * 100
  if (Math.abs(pct) < getThreshold()) return null
  if (d.every((x) => x >= 0)) return { dir: 'rising' as const, pct: Math.round(pct * 10) / 10, n: s.length }
  if (d.every((x) => x <= 0)) return { dir: 'falling' as const, pct: Math.round(pct * 10) / 10, n: s.length }
  return null
}

export function summarize(e: Entry[]) {
  const L: string[] = []
  if (e.some((x) => x.sim)) L.push('NOTE: some or all data below is SIMULATED (fictional).')
  for (const m of METRICS) {
    const s = series(e, m.key)
    if (s.length) L.push(`${m.label} (${m.unit}): ` + s.slice(-6).map((x) => `day ${x.day}: ${x.value}`).join(', '))
  }
  series(e, 'symptom').slice(-5).forEach((x) => L.push(`Symptom day ${x.day}, severity ${x.value}/5${x.region ? ' (' + x.region + ')' : ''}: ${x.note ?? ''}`))
  return L.join('\n')
}

// ---- Simulated demo mission (fictional, clearly labelled) ----
const W = [1, 8, 15, 22, 29, 36, 43, 50]
const D: Record<string, number[]> = {
  hr: [64, 63, 65, 62, 66, 64, 65, 63],
  spo2: [98, 98, 97, 98, 98, 97, 98, 98],
  rbc: [4.9, 4.8, 4.8, 4.7, 4.7, 4.6, 4.6, 4.5],
  wbc: [6.1, 6.3, 5.9, 6.2, 6.0, 6.4, 6.1, 6.2],
  ucal: [4.1, 4.3, 4.6, 5.0, 5.3, 5.9, 6.4, 6.9],
  sleep: [7.1, 6.8, 6.9, 6.5, 6.2, 6.4, 6.0, 5.9],
  muscle: [100, 98, 96, 93, 91, 88, 86, 83],
}
export function loadDemo() {
  update((s) => {
    const entries = s.entries.filter((x) => !x.sim)
    let n = 0
    for (const k in D) D[k].forEach((v, i) => entries.push({ id: 'sim' + n++, day: W[i], key: k as MetricKey, value: v, sim: true }))
    ;[[1, 1.12], [29, 1.11], [50, 1.09]].forEach(([d, v]) => entries.push({ id: 'sim' + n++, day: d, key: 'bone', value: v, sim: true }))
    entries.push({ id: 'sim' + n++, day: 43, key: 'symptom', value: 2, region: 'left thigh', note: 'Legs feel weak when pushing off the wall (SIMULATED)', sim: true })
    const p = s.profile ?? { callsign: 'SIM-CREW', day: 50 }
    return { ...s, entries, demo: true, profile: { ...p, day: Math.max(p.day, 50) } }
  })
}
