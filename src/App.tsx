import { useRef, useState } from 'react'
import Body from './Body'
import Chat, { Msg } from './Chat'
import Emergency from './Emergency'
import { buildRecs, buildSummary, Rec } from './recs'
import { HealthData, Trends, Simulated } from './Data'
import type { Pick } from './Camera'
import { RISKS, SOURCES, TOOLS, VALIDATION } from './content'
import PageTags from './Tags'
import { About, GuidedDemo } from './Guide'
import { METRICS, getThreshold, loadDemo, latest, mlabel, munit, summarize, trend, series, update, useStore, Entry } from './store'

const PAGES = ['Home', 'ASTRA AI', 'Body Systems', 'Health Data', 'Trends', 'Spaceflight Risks', 'Recommendations', 'Sources', 'Status', 'Settings'] as const
type Page = (typeof PAGES)[number]

export default function App() {
  const s = useStore()
  const [page, setPage] = useState<Page>('Home')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [prompt, setPrompt] = useState('')
  const [emg, setEmg] = useState(false)
  const [copied, setCopied] = useState(false)
  const pick = useRef<Pick | null>(null)
  const [cs, setCs] = useState(''), [cd, setCd] = useState('1')
  const e = s.entries
  const ask = (q: string) => { setPrompt(q); setPage('ASTRA AI') }
  const day = s.profile?.day ?? 1
  const copySummary = () => { navigator.clipboard?.writeText(buildSummary(e, s.profile?.callsign ?? 'CREW', day)).then(() => setCopied(true)).catch(() => {}) }
  const demoSteps = [
    { label: '1. Load the simulated mission', detail: 'Fills 8 fictional weeks of readings, all labelled SIMULATED.', run: () => loadDemo() },
    { label: '2. Log a reading', detail: 'Add a new measurement and see it recorded against the mission day.', run: () => setPage('Health Data') },
    { label: '3. Review the trends', detail: 'ASTRA flags the muscle and urinary calcium changes with the prototype rule.', run: () => setPage('Trends') },
    { label: '4. Point at the left thigh', detail: 'Opens the thigh: anatomy, NASA-informed spaceflight effects and your readings. Press Read aloud to hear it.', run: () => { pick.current = { id: 'thigh', side: 'left' }; setPage('Body Systems') } },
    { label: '5. Ask ASTRA', detail: 'ASTRA asks follow-up questions and explains, without diagnosing.', run: () => ask('My left thigh feels weak. What could be going on?') },
    { label: '6. See your recommendations', detail: 'Personalised suggestions, with questions to raise with your medical officer.', run: () => setPage('Recommendations') },
    { label: '7. Prepare a summary for medical personnel', detail: 'Copies your readings, trend flags and symptoms so you can share them.', run: copySummary },
  ]

  const top = (
    <header className="top">
      <div className="brand">ASTRA <span>space health assistant</span></div>
      {s.profile && <div className="muted">Callsign {s.profile.callsign} | Mission day {s.profile.day}</div>}
      <button className="btn danger" onClick={() => setEmg(true)}>Emergency</button>
    </header>
  )

  if (!s.profile) {
    return (
      <div>
        {top}
        <main className="onboard card">
          <h1>Hello, I am ASTRA.</h1>
          <p className="lead">Your personal space health assistant. How are you feeling today? Nothing is logged yet, so we are starting fresh on day one. I only need a callsign and your mission day.</p>
          <form onSubmit={(ev) => { ev.preventDefault(); update((st) => ({ ...st, profile: { callsign: cs.trim().slice(0, 24) || 'CREW', day: Math.max(1, Math.min(5000, parseInt(cd) || 1)) } })) }}>
            <label>Callsign<input value={cs} onChange={(ev) => setCs(ev.target.value)} maxLength={24} placeholder="e.g. Nova" /></label>
            <label>Mission day<input inputMode="numeric" value={cd} onChange={(ev) => setCd(ev.target.value)} /></label>
            <button className="btn primary" type="submit">Start with ASTRA</button>
          </form>
          <p className="muted">Prototype. Use fictional information only. Data stays in this browser.</p>
        </main>
        {emg && <Emergency entries={e} day={day} onClose={() => setEmg(false)} />}
      </div>
    )
  }

  const flags = METRICS.map((m) => ({ m, t: trend(e, m.key) })).filter((x) => x.t)
  let body
  if (page === 'Home') body = (
    <div>
      <Simulated entries={e} />
      <About />
      <section className="card hero">
        <h1>{e.length ? `Welcome back, ${s.profile.callsign}.` : 'Day one. Nothing logged yet.'}</h1>
        <p className="lead">{e.length ? `${e.length} entries logged. Mission day ${day}.` : 'Hello, I am ASTRA. How are you feeling today? Start by logging a reading, talking to me, or pointing at an area of concern.'}</p>
        <div className="row"><button className="btn primary" onClick={() => setPage('Health Data')}>Log first readings</button><button className="btn" onClick={() => setPage('ASTRA AI')}>Talk to ASTRA</button><button className="btn" onClick={() => setPage('Body Systems')}>Point at a concern</button></div>
      </section>
      <GuidedDemo steps={demoSteps} copied={copied} />
      <section className="card"><h2>Notifications</h2>
        {flags.length ? <ul>{flags.map((x) => <li key={x.m.key} className="flag">Attention: {x.m.label} {x.t!.dir} {Math.abs(x.t!.pct)}% over last {x.t!.n} entries. <button className="link" onClick={() => setPage('Trends')}>View trend</button></li>)}</ul> : <p className="empty">No notifications. Trend flags appear once 3 or more entries show a pattern.</p>}
      </section>
      <section className="grid3">{METRICS.map((m) => { const l = latest(e, m.key); return <div className="card tile" key={m.key}><h3>{m.label}</h3>{l ? <p className="big">{l.value} <small>{munit(m.key)}</small></p> : <p className="empty">Not logged yet</p>}</div> })}</section>
    </div>
  )
  else if (page === 'ASTRA AI') body = <Chat entries={e} msgs={msgs} setMsgs={(f) => setMsgs(f)} prompt={prompt} clearPrompt={() => setPrompt('')} onEmergency={() => setEmg(true)} day={day} />
  else if (page === 'Body Systems') body = <Body entries={e} onAsk={ask} pickRef={pick} />
  else if (page === 'Health Data') body = <HealthData entries={e} day={day} />
  else if (page === 'Trends') body = <Trends entries={e} />
  else if (page === 'Spaceflight Risks') body = (
    <div><p className="muted">Not every astronaut experiences every listed effect. Content is informed by NASA Human Research Program material (see Sources).</p>
      <div className="grid2">{RISKS.map((r) => <section className="card" key={r.title}><h2>{r.title}</h2><ul>{r.items.map((i) => <li key={i}>{i}</li>)}</ul><p><strong>Body systems:</strong> {r.systems}</p><p><strong>Related measurements:</strong> {r.measures}</p></section>)}</div></div>
  )
  else if (page === 'Recommendations') {
    const R = buildRecs(e, day)
    const groups: [Rec['kind'], string][] = [['attention', 'Needs attention'], ['routine', 'Build into your routine'], ['log', 'Logging']]
    body = (
      <div>
        <Simulated entries={e} />
        <div className="row"><button className="btn primary" onClick={copySummary}>Copy summary for medical personnel</button>{copied && <span className="flag" role="status">Copied</span>}</div>
        <p className="note">These suggestions come from your logged readings, symptoms and mission day. They are not a diagnosis. ASTRA does not prescribe medication, supplements, doses or exercise plans. Where a topic needs that (vitamins, minerals, medication, training changes), it is listed under "Ask your medical officer about" so you can raise it and follow your mission medical protocol. Trend flags use a simple prototype rule, not clinical thresholds.</p>
        {groups.map(([k, label]) => {
          const items = R.filter((r) => r.kind === k)
          if (!items.length) return null
          return (
            <div key={k}>
              <h2>{label}</h2>
              <div className="grid2">
                {items.map((r, i) => (
                  <section className="card" key={i}>
                    <h3>{r.title}</h3>
                    <p><strong>Why:</strong> {r.why}</p>
                    {r.todo.length > 0 && <div><strong>What you can do</strong><ul>{r.todo.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                    {r.ask.length > 0 && <div><strong>Ask your medical officer about</strong><ul>{r.ask.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                  </section>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  else if (page === 'Sources') body = (
    <div><p className="muted">NASA research informs ASTRA's content. No real astronaut data is used, and all demo numbers are simulated. Confirm each link and title before submitting.</p>
      <h2>NASA sources</h2>
      {SOURCES.map((x) => <section className="card" key={x.title}><h3>{x.title}</h3><p>{x.pub} | <a href={x.url} target="_blank" rel="noreferrer">{x.url}</a></p><p><strong>Provides:</strong> {x.gives}</p><p><strong>Used by:</strong> {x.use}</p></section>)}
      <h2>Third-party tools and credits</h2>
      <section className="card"><table><thead><tr><th>Tool</th><th>Licence</th><th>Used for</th></tr></thead><tbody>{TOOLS.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.lic}</td><td>{t.use}</td></tr>)}</tbody></table></section></div>
  )
  else if (page === 'Status') {
    const F: [string, string, string][] = [
      ['Day-one empty start, onboarding, local storage', 'Implemented', 'Data stays in this browser (localStorage)'],
      ['Health data logging with validation, current/previous/change', 'Implemented', 'Plausibility checks only, no clinical ranges'],
      ['Trend graphs, timeline, descriptive trend flags', 'Implemented', 'Needs 3 or more entries'],
      ['Clickable body map and body system panels', 'Implemented', 'Original simple SVG, not a 3D model'],
      ['Webcam pointing (MediaPipe pose + hand, 1.2 s hold, confirm)', 'Implemented', 'Approximate. Not diagnostic or emergency detection'],
      ['ASTRA chat with typed input', 'Implemented', 'AI needs server key, otherwise scripted replies'],
      ['Voice input and spoken replies', 'Implemented', 'Browser Web Speech API, best in Chrome'],
      ['Spaceflight risks, recommendations, sources pages', 'Implemented', 'Citations need team verification'],
      ['Emergency summary for medical personnel', 'Implemented', 'Does NOT contact mission control'],
      ['Demo mission data (8 weeks)', 'Simulated', 'Fictional, labelled, wipeable'],
      ['Predictive models (e.g. bone trend estimate)', 'Planned', 'Needs validated model and sufficient data'],
      ['NASA OSDR study lookup in Body Systems (live, saved copies as fallback)', 'Implemented', 'Real NASA study records with IDs. Mostly animal and cell studies, shown as context only'],
      ['Using NASA data numerically (for example comparing your trends with published values)', 'Planned', 'Needs validated, citable values'],
      ['3D anatomy models, wearable sensors, authentication, real comms', 'Planned', ''],
    ]
    body = (
      <div>
        <section className="card"><table><thead><tr><th>Feature</th><th>Status</th><th>Notes</th></tr></thead><tbody>{F.map((f) => <tr key={f[0]}><td>{f[0]}</td><td><span className={'pill ' + f[1]}>{f[1]}</span></td><td>{f[2]}</td></tr>)}</tbody></table></section>
        <section className="card"><h2>Scientific basis and validation</h2><table><thead><tr><th>Feature</th><th>Basis</th><th>Validation</th></tr></thead><tbody>{VALIDATION.map((v) => <tr key={v[0]}><td>{v[0]}</td><td>{v[1]}</td><td>{v[2]}</td></tr>)}</tbody></table></section>
      </div>
    )
  } else body = (
    <div className="grid2">
      <section className="card"><h2>Mission</h2>
        <label>Callsign<input value={s.profile.callsign} maxLength={24} onChange={(ev) => update((st) => ({ ...st, profile: { ...st.profile!, callsign: ev.target.value } }))} /></label>
        <p>Mission day: <strong>{s.profile.day}</strong> <button className="btn small" onClick={() => update((st) => ({ ...st, profile: { ...st.profile!, day: st.profile!.day + 1 } }))}>Advance one day</button></p>
        <button className="btn" onClick={() => { if (confirm('Reset profile and all data?')) { update(() => ({ profile: null, entries: [], demo: false })); setMsgs([]) } }}>Reset profile and all data</button></section>
      <section className="card"><h2>Demo data</h2>
        <p>Load 8 fictional weeks including a leg weakness scenario. Everything is labelled SIMULATED.</p>
        <div className="row"><button className="btn primary" onClick={loadDemo}>Load simulated demo mission (SIMULATED DATA)</button><button className="btn" onClick={() => update((st) => ({ ...st, entries: [], demo: false }))}>Wipe all data</button></div>
        <p className="muted">{series(e, 'hr').length + e.length > 0 ? `${e.length} entries stored.` : 'No data stored.'}</p></section>
      <section className="card"><h2>Trend sensitivity</h2>
        <p>A trend is flagged when the last 3 to 4 entries move one way by at least this much. It is a prototype setting, not a clinical threshold.</p>
        <label>Flag changes of at least<select value={getThreshold()} onChange={(ev) => update((st) => ({ ...st, threshold: Number(ev.target.value) }))}>{[3, 5, 10].map((n) => <option key={n} value={n}>{n}%</option>)}</select></label></section>
      <section className="card"><h2>Data protection</h2><p>Data is stored unencrypted in this browser only. There is no authentication. This is not medical-grade security. Use fictional data only. The AI key lives in the server .env file, never in the frontend.</p></section>
    </div>
  )

  return (
    <div>
      {top}
      <div className="shell">
        <nav aria-label="Main">{PAGES.map((p) => <button key={p} className={'nav' + (page === p ? ' on' : '')} onClick={() => setPage(p)} aria-current={page === p ? 'page' : undefined}>{p}</button>)}</nav>
        <main><h1 className="ph">{page}</h1><PageTags page={page} entries={e} />{body}</main>
      </div>
      {emg && <Emergency entries={e} callsign={s.profile?.callsign} day={day} onClose={() => setEmg(false)} />}
    </div>
  )
}
