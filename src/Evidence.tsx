import { useEffect, useState } from 'react'
import type { SysKey } from './store'
import { SAVED, Study, TERMS, recordLink, searchLink, searchOSDR } from './osdr'

type St = { status: 'loading' | 'live' | 'saved' | 'none'; total?: number; studies: Study[] }

export default function Evidence({ sys }: { sys: SysKey }) {
  const [st, setSt] = useState<St>({ status: 'loading', studies: [] })
  const term = TERMS[sys]
  useEffect(() => {
    let on = true
    setSt({ status: 'loading', studies: [] })
    searchOSDR(term).then((r) => { if (on) setSt({ status: 'live', total: r.total, studies: r.studies }) }).catch(() => {
      if (!on) return
      const sv = SAVED[sys]
      setSt(sv ? { status: 'saved', total: sv.total, studies: sv.studies } : { status: 'none', studies: [] })
    })
    return () => { on = false }
  }, [sys, term])

  return (
    <div className="evid">
      <h3>NASA research evidence (OSDR)</h3>
      <p className="muted">Real study records from the NASA Open Science Data Repository. They are mostly animal and cell studies, so they give research context. They are not measurements for you and they do not diagnose anything.</p>
      {st.status === 'loading' && <p role="status">Searching NASA OSDR for "{term}"...</p>}
      {st.status === 'live' && <p><span className="tag nasa">Live from NASA OSDR</span> {st.total} records matched "{term}". Showing {st.studies.length}.</p>}
      {st.status === 'saved' && <p><span className="tag sim">Saved copy</span> Live lookup was unavailable, so these are saved copies of real OSDR records ({st.total} matched "{term}" when retrieved).</p>}
      {st.status === 'none' && <p className="empty">The live lookup was unavailable and there is no saved copy for this system. Use the search link below.</p>}
      {st.studies.map((s) => (
        <div className="study" key={s.id}>
          <strong>{s.id}: {s.title}</strong>
          <div className="muted">{[s.organism, s.type, s.material, s.mission, s.flight].filter(Boolean).join(' | ')}</div>
          {s.summary && <p>{s.summary}</p>}
          <a href={recordLink(s.id)} target="_blank" rel="noreferrer">View record (NASA OSDR JSON)</a>
        </div>
      ))}
      <p><a href={searchLink(term)} target="_blank" rel="noreferrer">Search OSDR for "{term}"</a></p>
    </div>
  )
}
