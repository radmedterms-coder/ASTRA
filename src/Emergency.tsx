import { useEffect, useRef, useState } from 'react'
import { Entry, summarize, update } from './store'

const FLAGS: { label: string; re: RegExp; urgent?: boolean }[] = [
  { label: 'Chest pain or pressure', re: /chest (pain|pressure|tight)|tight(ness)? in (my )?chest|pressure in (my )?chest/, urgent: true },
  { label: 'Trouble breathing', re: /short(ness)? of breath|can'?t breathe|cannot breathe|hard to breathe|trouble breathing|difficulty breathing|struggling to breathe|gasping/, urgent: true },
  { label: 'Fainting or near fainting', re: /faint|pass(ed|ing)? out|blacked? out|light-?headed/, urgent: true },
  { label: 'Heavy bleeding', re: /bleed|blood loss|hemorrhag/, urgent: true },
  { label: 'Stroke-type signs', re: /slurred|face droop|can'?t move (my )?(arm|leg)|sudden(ly)? (numb|weak)/, urgent: true },
  { label: 'Seizure', re: /seiz|convuls/, urgent: true },
  { label: 'Confusion', re: /confus|disorient|can'?t think/, urgent: true },
  { label: 'Allergic reaction', re: /allerg|hives|throat (closing|swelling)|swelling (of|in) (my )?(face|throat|tongue)/, urgent: true },
  { label: 'Severe headache', re: /(severe|worst|splitting|sudden).{0,15}headache|headache.{0,15}(severe|worst)/, urgent: true },
  { label: 'Headache', re: /headache|head hurts/ },
  { label: 'Palpitations or fast heartbeat', re: /palpitat|heart (racing|pounding|fluttering|skipping)|fast heart|irregular (heart|pulse)/ },
  { label: 'Dizziness or balance', re: /dizz|vertigo|spinning|off balance/ },
  { label: 'Weakness', re: /weak|can'?t lift|heavy legs|no strength/ },
  { label: 'Numbness or tingling', re: /numb|tingl|pins and needles/ },
  { label: 'Nausea or vomiting', re: /nause|vomit|throw(ing)? up/ },
  { label: 'Fever or chills', re: /fever|chills|feverish/ },
  { label: 'Vision change', re: /blurr|double vision|can'?t see|flashes/ },
  { label: 'Ear or hearing problem', re: /\bear\b|ringing|tinnitus|can'?t hear/ },
  { label: 'Stomach problem', re: /stomach|abdom|belly|diarrh|constipat/ },
  { label: 'Skin or rash', re: /rash|itch/ },
  { label: 'Sleep, mood or anxiety concern', re: /can'?t sleep|insomnia|panic|anxious|anxiety|depress|overwhelm/ },
  { label: 'Injury', re: /injur|\bfell\b|\bfall\b|hit my|struck|\bcut\b|burn|sprain|broke|fracture|twisted/ },
  { label: 'Pain', re: /\bpain|hurts?\b|\bache|aching|sore|cramp/ },
]
const REGION = /\b(?:(left|right)\s+)?(thigh|calf|calves|shin|knee|ankle|foot|feet|legs?|hip|shoulder|elbow|wrist|hand|arm|chest|back|neck|head|stomach|abdomen|belly|eye|ear|throat|jaw|groin|ribs?)\b/
const ONSET = /\b(just now|suddenly|all of a sudden|this morning|last night|yesterday|(?:\d+|an?|one|two|three|four|five|few|couple(?: of)?)\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?)(?:\s+ago)?)/

// Keyword extraction from the astronaut's own words. Not a diagnosis.
export function triage(text: string) {
  const t = text.toLowerCase()
  let flags = FLAGS.filter((f) => f.re.test(t))
  if (flags.length > 1) flags = flags.filter((f) => f.label !== 'Pain')
  if (flags.some((f) => f.label === 'Severe headache')) flags = flags.filter((f) => f.label !== 'Headache')
  const rm = t.match(REGION), om = t.match(ONSET), nm = t.match(/(\d{1,2})\s*(?:out of|\/)\s*10/)
  return {
    flags,
    region: rm ? `${rm[1] ? rm[1] + ' ' : ''}${rm[2]}` : '',
    onset: om ? om[1] : '',
    severity: nm ? `${nm[1]}/10` : /severe|worst|unbearable|extreme|excruciating/.test(t) ? 'severe' : /\bmild|slight/.test(t) ? 'mild' : '',
  }
}

function say(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05; u.onend = () => onEnd?.(); u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}

function readbackText(text: string) {
  const r = triage(text)
  if (!r.flags.length) return 'I have your report. Say more, or press Send to medical log.'
  const bits = [r.flags.map((f) => f.label.toLowerCase()).join(', '), r.region, r.onset].filter(Boolean).join(', ')
  return `I heard: ${bits}. ${r.flags.some((f) => f.urgent) ? 'Start your emergency medical protocol and alert your crew medical officer now.' : 'Tell your medical officer.'} Say more, or press Send to medical log.`
}

export default function Emergency({ entries, callsign, day, onClose }: { entries: Entry[]; callsign?: string; day: number; onClose: () => void }) {
  const [t, setT] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceErr, setVoiceErr] = useState('')
  const [sent, setSent] = useState(false)
  const textRef = useRef(t); textRef.current = t
  const recRef = useRef<any>(null) // eslint-disable-line
  const dead = useRef(false)
  const tri = triage(t)
  const urgent = tri.flags.some((f) => f.urgent)

  function listen() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition // eslint-disable-line
    if (!SR) { setVoiceErr('Voice input needs Chrome. Type your report instead.'); return }
    recRef.current?.abort()
    speechSynthesis?.cancel()
    const r = new SR(); r.lang = 'en-US'; r.interimResults = true; r.continuous = true
    const base = textRef.current.trim()
    r.onresult = (ev: any) => { // eslint-disable-line
      if (recRef.current !== r) return
      let s = ''
      for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript
      setT((base ? base + ' ' : '') + s.trim()); setSent(false)
    }
    r.onerror = (ev: any) => { // eslint-disable-line
      if (recRef.current !== r) return
      setListening(false)
      const c = ev.error as string
      setVoiceErr(
        c === 'not-allowed' ? 'Microphone is blocked. Click the lock icon in the Chrome address bar, set Microphone to Allow, then tap to talk again.'
        : c === 'service-not-allowed' || c === 'network' ? 'Voice recognition is not available here. Open http://localhost:5173 in the Chrome browser (not the VS Code tab) and check your internet connection. You can also type your report.'
        : c === 'audio-capture' ? 'No microphone found. Plug one in or check Windows sound settings, or type your report.'
        : c === 'no-speech' ? 'I did not hear anything. Tap to talk and speak closer to the mic.'
        : `Voice input stopped (${c}). Tap to talk again, or type.`)
    }
    r.onend = () => { if (recRef.current !== r) return; setListening(false); if (!dead.current && textRef.current.trim()) say(readbackText(textRef.current)) }
    recRef.current = r; setVoiceErr(''); setListening(true)
    try { r.start() } catch { setListening(false) }
  }

  useEffect(() => {
    dead.current = false
    say('Emergency support. What is happening?', () => { if (!dead.current) listen() })
    return () => { dead.current = true; if ('speechSynthesis' in window) speechSynthesis.cancel(); recRef.current?.abort() }
  }, []) // eslint-disable-line

  const packet = [
    'ASTRA EMERGENCY REPORT (prototype)',
    `Callsign: ${callsign || 'unknown'} | Mission day ${day}`,
    `Reported: "${t.trim() || '(nothing yet)'}"`,
    tri.flags.length ? `Indications noted: ${tri.flags.map((f) => f.label + (f.urgent ? ' (urgent-type)' : '')).join(', ')}` : '',
    tri.region ? `Region: ${tri.region}` : '', tri.onset ? `Onset: ${tri.onset}` : '', tri.severity ? `Severity: ${tri.severity}` : '',
    'Logged data:', summarize(entries) || '(nothing logged)',
    "Keyword summary of the crew member's own words. Not a diagnosis. Not transmitted by ASTRA.",
  ].filter(Boolean).join('\n')

  function send() {
    if (!t.trim()) return
    recRef.current?.abort()
    const num = parseInt(tri.severity)
    const sev = urgent || tri.severity === 'severe' ? 5 : tri.severity === 'mild' ? 1 : num ? Math.min(5, Math.max(1, Math.round(num / 2))) : 3
    update((s) => ({ ...s, entries: [...s.entries, { id: crypto.randomUUID(), day, key: 'symptom', value: sev, note: 'EMERGENCY REPORT: ' + t.trim().slice(0, 260), region: tri.region || undefined }] }))
    navigator.clipboard?.writeText(packet).catch(() => {})
    setSent(true); say('Report saved. Tell your medical officer now.')
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Emergency support">
      <div className="card emg">
        <h2>Emergency support</h2>
        <p className="err"><strong>Follow your mission medical protocol and alert your crew medical officer. ASTRA cannot contact mission control.</strong></p>
        <button className={'btn mic' + (listening ? ' on' : '')} onClick={listening ? () => recRef.current?.stop() : listen} aria-pressed={listening}>{listening ? 'Listening... tap when done' : 'Tap to talk'}</button>
        {voiceErr && <p className="err" role="alert">{voiceErr}</p>}
        <label>Your report (edit if needed)<textarea rows={3} value={t} onChange={(e) => { setT(e.target.value); setSent(false) }} maxLength={1000} placeholder="Just say what is happening, e.g. chest pain, 20 minutes" /></label>
        {t.trim() && (
          <div aria-live="polite">
            <h3>What I picked up</h3>
            <div className="chips">
              {tri.flags.map((f) => <span key={f.label} className={'chip' + (f.urgent ? ' urgent' : '')}>{f.label}</span>)}
              {tri.region && <span className="chip">Region: {tri.region}</span>}
              {tri.onset && <span className="chip">Onset: {tri.onset}</span>}
              {tri.severity && <span className="chip">Severity: {tri.severity}</span>}
              {!tri.flags.length && !tri.region && <span className="muted">No specific indication found yet. Say more if you can.</span>}
            </div>
            {urgent && <p className="err"><strong>Urgent-type symptoms reported. Start your emergency medical protocol now.</strong></p>}
            <p className="muted">Keywords from your own words, not a diagnosis.</p>
          </div>
        )}
        <details><summary>Report preview</summary><pre>{packet}</pre></details>
        <div className="row">
          <button className="btn primary" onClick={send} disabled={!t.trim()}>Send to medical log</button>
          <button className="btn" onClick={() => { setT(''); setSent(false); recRef.current?.abort() }}>Clear</button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <p className="muted">Send saves this report to your on-device log and copies it so you can read or paste it to your medical officer. It is not transmitted anywhere.</p>
        {sent && <p className="flag" role="status">Report saved and copied. Tell your crew medical officer now.</p>}
      </div>
    </div>
  )
}
