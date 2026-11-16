import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Entry, METRICS, MetricKey, latest, mlabel, munit, series, trend, update, getThreshold } from './store'
import { REGIONS } from './content'

export function Simulated({ entries }: { entries: Entry[] }) {
  return entries.some((e) => e.sim) ? <p className="sim" role="note">SIMULATED DATA: fictional values for demonstration. Not real astronaut or NASA data.</p> : null
}

export function HealthData({ entries, day }: { entries: Entry[]; day: number }) {
  const [key, setKey] = useState<MetricKey>('hr')
  const [d, setD] = useState(String(day)), [v, setV] = useState(''), [note, setNote] = useState('')
  const [sd, setSd] = useState(String(day)), [sev, setSev] = useState('2'), [stext, setStext] = useState(''), [reg, setReg] = useState('')
  const [err, setErr] = useState(''), [serr, setSerr] = useState('')
  const m = METRICS.find((x) => x.key === key)!

  function add(e: React.FormEvent) {
    e.preventDefault()
    const val = Number(v), dd = Number(d)
    if (!Number.isInteger(dd) || dd < 1 || dd > 5000) return setErr('Mission day must be a whole number from 1 to 5000.')
    if (v.trim() === '' || !Number.isFinite(val)) return setErr('Enter a number for the value.')
    if (val < m.min || val > m.max) return setErr(`${m.label} must be between ${m.min} and ${m.max} ${m.unit} (input check only, not a clinical range). Check the value and units.`)
    setErr(''); setV(''); setNote('')
    update((s) => ({ ...s, entries: [...s.entries, { id: crypto.randomUUID(), day: dd, key, value: val, note: note.slice(0, 200) || undefined }] }))
  }
  function addSym(e: React.FormEvent) {
    e.preventDefault()
    const dd = Number(sd)
    if (!Number.isInteger(dd) || dd < 1 || dd > 5000) return setSerr('Mission day must be a whole number from 1 to 5000.')
    if (stext.trim().length < 3) return setSerr('Describe the symptom in a few words.')
    setSerr(''); setStext('')
    update((s) => ({ ...s, entries: [...s.entries, { id: crypto.randomUUID(), day: dd, key: 'symptom', value: Number(sev), note: stext.trim().slice(0, 300), region: reg || undefined }] }))
  }
  const del = (id: string) => update((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) }))
  const recent = [...entries].sort((a, b) => b.day - a.day).slice(0, 15)

  return (
    <div>
      <Simulated entries={entries} />
      <section className="grid3">
        {METRICS.map((mm) => {
          const s = series(entries, mm.key), l = latest(entries, mm.key), prev = s.length > 1 ? s[s.length - 2] : null, t = trend(entries, mm.key)
          return (
            <div className="card tile" key={mm.key}>
              <h3>{mm.label}</h3>
              {l ? <p className="big">{l.value} <small>{mm.unit}</small></p> : <p className="empty">Not logged yet</p>}
              {l && <p className="muted">Day {l.day}{prev ? ` | previous ${prev.value} (day ${prev.day}) | change ${(l.value - prev.value) > 0 ? '+' : ''}${Math.round((l.value - prev.value) * 100) / 100}` : ' | no previous reading'}</p>}
              <p className="muted">Reference range: none set (add one from a cited source)</p>
              {t && <p className="flag">Attention: {t.dir} {Math.abs(t.pct)}% across last {t.n} entries</p>}
            </div>
          )
        })}
      </section>
      <div className="grid2">
        <form className="card" onSubmit={add}>
          <h2>Log a measurement</h2>
          <label>Measurement<select value={key} onChange={(e) => setKey(e.target.value as MetricKey)}>{METRICS.map((x) => <option key={x.key} value={x.key}>{x.label} ({x.unit})</option>)}</select></label>
          <label>Mission day<input inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} /></label>
          <label>Value ({m.unit})<input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} /></label>
          <label>Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn primary" type="submit">Save measurement</button>
        </form>
        <form className="card" onSubmit={addSym}>
          <h2>Report a symptom</h2>
          <label>Mission day<input inputMode="numeric" value={sd} onChange={(e) => setSd(e.target.value)} /></label>
          <label>What are you experiencing?<input value={stext} onChange={(e) => setStext(e.target.value)} maxLength={300} /></label>
          <label>Severity (1 mild, 5 severe)<select value={sev} onChange={(e) => setSev(e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Body region (optional)<select value={reg} onChange={(e) => setReg(e.target.value)}><option value="">Not specified</option>{Object.entries(REGIONS).map(([k, r]) => <option key={k} value={r.label.toLowerCase()}>{r.label}</option>)}</select></label>
          {serr && <p className="err" role="alert">{serr}</p>}
          <button className="btn primary" type="submit">Save symptom</button>
        </form>
      </div>
      <section className="card">
        <h2>Recent entries</h2>
        {!recent.length ? <p className="empty">No entries yet. Log your first reading above.</p> : (
          <table><thead><tr><th>Day</th><th>Item</th><th>Value</th><th>Note</th><th /></tr></thead><tbody>
            {recent.map((x) => <tr key={x.id}><td>{x.day}</td><td>{x.key === 'symptom' ? 'Symptom' : mlabel(x.key)}{x.sim ? ' [SIM]' : ''}</td><td>{x.key === 'symptom' ? `severity ${x.value}/5` : `${x.value} ${munit(x.key)}`}</td><td>{x.region ? x.region + ': ' : ''}{x.note}</td><td><button className="btn small" onClick={() => del(x.id)} aria-label="Delete entry">Delete</button></td></tr>)}
          </tbody></table>
        )}
      </section>
    </div>
  )
}

export function Trends({ entries }: { entries: Entry[] }) {
  const days = [...new Set(entries.map((e) => e.day))].sort((a, b) => a - b)
  return (
    <div>
      <Simulated entries={entries} />
      <div className="note"><p>Trend flags use a simple prototype rule: the last 3 to 4 entries move in one direction by {getThreshold()}% or more. It is not a clinical threshold. Predictions are not shown because no validated model is integrated yet (Planned).</p>
        <details><summary>Why {getThreshold()}%?</summary><p>It is a prototype setting chosen to avoid flagging small day-to-day variation. It is not a value from NASA or clinical research. You can change it in Settings. A real system would use validated, measurement-specific limits and personal baselines.</p></details></div>
      <section className="grid2">
        {METRICS.map((m) => {
          const s = series(entries, m.key), t = trend(entries, m.key)
          return (
            <div className="card" key={m.key}>
              <h3>{m.label} ({m.unit})</h3>
              {t && <p className="flag">Attention: {t.dir} {Math.abs(t.pct)}% across last {t.n} entries. This is a pattern to review, not a diagnosis.</p>}
              {s.length === 0 ? <p className="empty">No data yet. Log your first reading in Health Data.</p>
                : s.length < 3 ? <p className="empty">{s.length} of 3 entries needed to show a trend. Latest: {s[s.length - 1].value} {m.unit} (day {s[s.length - 1].day}).</p>
                : (
                  <div role="img" aria-label={`${m.label} over time: ${s.map((x) => `day ${x.day} ${x.value}`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height={190}>
                      <LineChart data={s.map((x) => ({ day: x.day, value: x.value }))} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                        <CartesianGrid stroke="#24325a" />
                        <XAxis dataKey="day" stroke="#93a4cf" />
                        <YAxis stroke="#93a4cf" domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: '#0f1730', border: '1px solid #24325a' }} />
                        <Line type="monotone" dataKey="value" stroke="#5ee0ff" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          )
        })}
      </section>
      <section className="card">
        <h2>Assessment timeline</h2>
        {!days.length ? <p className="empty">No assessments yet.</p> : (
          <ol className="timeline">{days.map((d) => <li key={d}><strong>Day {d}</strong>: {entries.filter((e) => e.day === d).map((e) => (e.key === 'symptom' ? 'symptom report' : mlabel(e.key))).join(', ')}</li>)}</ol>
        )}
      </section>
    </div>
  )
}
