import { useEffect, useState } from 'react'
import Camera, { Pick, regionText } from './Camera'
import { REGIONS, SYSTEMS } from './content'
import { Entry, mlabel, munit, latest, trend, MetricKey } from './store'
import { say, stopSaying, describe } from './speech'
import Evidence from './Evidence'

const SHAPES: { id: string; side?: 'left' | 'right'; x: number; y: number; w: number; h: number; r: number }[] = [
  { id: 'head', x: 80, y: 8, w: 40, h: 48, r: 20 },
  { id: 'neck', x: 92, y: 56, w: 16, h: 14, r: 4 },
  { id: 'chest', x: 68, y: 72, w: 64, h: 48, r: 8 },
  { id: 'abdomen', x: 72, y: 122, w: 56, h: 44, r: 8 },
  { id: 'shoulder', side: 'left', x: 134, y: 68, w: 26, h: 24, r: 12 },
  { id: 'shoulder', side: 'right', x: 40, y: 68, w: 26, h: 24, r: 12 },
  { id: 'upperarm', side: 'left', x: 140, y: 96, w: 16, h: 56, r: 7 },
  { id: 'upperarm', side: 'right', x: 44, y: 96, w: 16, h: 56, r: 7 },
  { id: 'forearm', side: 'left', x: 142, y: 156, w: 14, h: 56, r: 7 },
  { id: 'forearm', side: 'right', x: 44, y: 156, w: 14, h: 56, r: 7 },
  { id: 'hip', side: 'left', x: 101, y: 170, w: 32, h: 26, r: 8 },
  { id: 'hip', side: 'right', x: 67, y: 170, w: 32, h: 26, r: 8 },
  { id: 'thigh', side: 'left', x: 102, y: 200, w: 28, h: 88, r: 11 },
  { id: 'thigh', side: 'right', x: 70, y: 200, w: 28, h: 88, r: 11 },
  { id: 'lowerleg', side: 'left', x: 104, y: 294, w: 24, h: 90, r: 10 },
  { id: 'lowerleg', side: 'right', x: 72, y: 294, w: 24, h: 90, r: 10 },
  { id: 'foot', side: 'left', x: 102, y: 390, w: 32, h: 14, r: 6 },
  { id: 'foot', side: 'right', x: 66, y: 390, w: 32, h: 14, r: 6 },
]

export default function Body({ entries, onAsk, pickRef }: { entries: Entry[]; onAsk: (q: string) => void; pickRef: { current: Pick | null } }) {
  const [sel, setSel] = useState<Pick | null>(pickRef.current)
  const [sys, setSys] = useState(0)
  const [useCam, setUseCam] = useState(false)
  const [auto, setAuto] = useState(() => { try { return localStorage.getItem('astra.autoread') !== 'off' } catch { return true } })
  const toggleAuto = (v: boolean) => { setAuto(v); try { localStorage.setItem('astra.autoread', v ? 'on' : 'off') } catch { /* ignore */ } if (!v) stopSaying() }
  useEffect(() => () => stopSaying(), [])
  const choose = (p: Pick) => { pickRef.current = p; setSel(p); setSys(0); if (auto) say(describe(p, 0, entries)) }
  const reg = sel ? REGIONS[sel.id] : null
  const name = sel && reg ? regionText(sel, reg.label) : ''

  return (
    <div className="grid2">
      <section className="card">
        <h2>Body map</h2>
        <p className="muted">Select a region. Left and right are the person's own sides. Selection is approximate and is not a diagnosis.</p>
        <svg viewBox="0 0 200 420" className="body" role="group" aria-label="Clickable body map">
          {SHAPES.map((s, i) => {
            const on = sel?.id === s.id && sel?.side === s.side
            const label = regionText({ id: s.id, side: s.side }, REGIONS[s.id].label)
            return (
              <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} className={'reg' + (on ? ' on' : '')} role="button" tabIndex={0} aria-label={label} aria-pressed={on}
                onClick={() => choose({ id: s.id, side: s.side })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose({ id: s.id, side: s.side }) } }}>
                <title>{label}</title>
              </rect>
            )
          })}
        </svg>
        <button className="btn" onClick={() => setUseCam(!useCam)}>{useCam ? 'Hide camera pointing' : 'Use camera pointing (standing, full body)'}</button>
        {useCam && <Camera labelOf={(id) => REGIONS[id].label} onPick={choose} />}
      </section>
      <section className="card">
        {!reg || !sel ? (
          <div><h2>Body systems</h2><p className="empty">Nothing selected yet. Click a region on the body map or point at it with the camera.</p></div>
        ) : (
          <div>
            <h2>{name[0].toUpperCase() + name.slice(1)}</h2>
            <p><strong>Structures:</strong> {reg.structures}</p>
            <div className="tabs" role="tablist">
              {reg.systems.map((k, i) => <button key={k} role="tab" aria-selected={sys === i} className={'tab' + (sys === i ? ' on' : '')} onClick={() => { setSys(i); if (auto) say(describe(sel, i, entries)) }}>{SYSTEMS[k].label}</button>)}
            </div>
            {(() => {
              const S = SYSTEMS[reg.systems[sys]]
              return (
                <div>
                  <p><strong>Key structures:</strong> {S.structures}</p>
                  <p><strong>Function:</strong> {S.fn}</p>
                  <p><strong>Possible spaceflight effects:</strong> {S.effects}</p>
                  <h3>Your logged measurements</h3>
                  <ul>
                    {S.metrics.map((k: MetricKey) => {
                      const l = latest(entries, k), t = trend(entries, k)
                      return <li key={k}>{mlabel(k)}: {l ? `${l.value} ${munit(k)} (day ${l.day})${l.sim ? ' [SIMULATED]' : ''}` : 'not logged yet'}{t ? ` | Trend flag: ${t.dir} ${Math.abs(t.pct)}% over last ${t.n} entries` : ''}</li>
                    })}
                  </ul>
                  <p className="note"><strong>Warning indicators:</strong> {S.warn}</p>
                  <Evidence sys={reg.systems[sys]} />
                </div>
              )
            })()}
            <div className="row">
              <button className="btn" onClick={() => say(describe(sel, sys, entries))}>Read aloud</button>
              <button className="btn" onClick={stopSaying}>Stop</button>
              <label className="chk"><input type="checkbox" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} /> Read automatically when I select</label>
            </div>
            <button className="btn primary" onClick={() => onAsk(`I have a concern about my ${name}. What could be relevant given my logged data?`)}>Ask ASTRA about this</button>
          </div>
        )}
      </section>
    </div>
  )
}
