import { useEffect, useRef, useState } from 'react'
import { Entry, summarize } from './store'
import { detectLang, scripted } from './lang'

export interface Msg { role: 'user' | 'assistant'; content: string; src?: string }

export default function Chat({ entries, msgs, setMsgs, prompt, clearPrompt, onEmergency, day }: {
  day: number; entries: Entry[]; msgs: Msg[]; setMsgs: (f: (m: Msg[]) => Msg[]) => void; prompt: string; clearPrompt: () => void; onEmergency: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [speak, setSpeak] = useState(false)
  const [listening, setListening] = useState(false)
  const [ai, setAi] = useState<string | null>(null)
  const [vlang, setVlang] = useState<string>(() => { try { return localStorage.getItem('astra.vlang') || 'en-US' } catch { return 'en-US' } })
  useEffect(() => { try { localStorage.setItem('astra.vlang', vlang) } catch { /* ignore */ } }, [vlang])
  const end = useRef<HTMLDivElement>(null)
  const msgsRef = useRef(msgs); msgsRef.current = msgs
  const speakRef = useRef(speak); speakRef.current = speak
  const recRef = useRef<any>(null) // eslint-disable-line
  const silence = useRef(0)
  const sendRef = useRef<(q: string, v?: boolean) => void>(() => {})
  const micRef = useRef<() => void>(() => {})

  useEffect(() => { fetch('/api/status').then((r) => r.json()).then((j) => setAi(j.ai ? j.provider : '')).catch(() => setAi('')) }, [])

  async function send(q: string, viaVoice = false) {
    q = q.trim(); if (!q || busy) return
    const lang = detectLang(q)
    setVlang(lang === 'fr' ? 'fr-FR' : 'en-US')
    if (/\b(emergency|urgence)\b/i.test(q)) onEmergency()
    const next: Msg[] = [...msgsRef.current, { role: 'user', content: q }]
    setMsgs(() => next); setText(''); setBusy(true)
    let reply: Msg
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), context: `Current mission day: ${day}\n` + summarize(entries) }) })
      if (!r.ok) throw new Error('no ai')
      const j = await r.json()
      reply = { role: 'assistant', content: j.text, src: lang === 'fr' ? 'Réponse IA' : 'AI reply' }
    } catch {
      reply = { role: 'assistant', content: scripted(q, entries, lang), src: lang === 'fr' ? 'Réponse de base (aucune IA connectée)' : 'Basic reply (no AI connected)' }
    }
    setMsgs((m) => [...m, reply]); setBusy(false)
    if (speakRef.current && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(reply.content.replace(/[#*]/g, ' '))
      u.rate = 1.05; u.lang = detectLang(reply.content) === 'fr' ? 'fr-FR' : 'en-US'
      if (viaVoice) u.onend = () => micRef.current()
      speechSynthesis.speak(u)
    }
  }
  sendRef.current = send

  useEffect(() => { if (prompt) { send(prompt); clearPrompt() } }, [prompt]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])
  useEffect(() => () => { recRef.current = null; if ('speechSynthesis' in window) speechSynthesis.cancel() }, [])

  // Listens until you stop talking for about 2 seconds, shows your words live, then sends them as one message.
  function mic() {
    if (listening) { recRef.current?.stop(); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition // eslint-disable-line
    if (!SR) { setMsgs((m) => [...m, { role: 'assistant', content: 'Voice input is not supported in this browser. Use Chrome, or type your message.', src: 'System' }]); return }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    setSpeak(true)
    const r = new SR(); r.lang = vlang; r.interimResults = true; r.continuous = true
    const base = text.trim()
    let heard = ''
    r.onresult = (ev: any) => { // eslint-disable-line
      if (recRef.current !== r) return
      let s = ''
      for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript
      heard = s.trim()
      setText((base ? base + ' ' : '') + heard)
      clearTimeout(silence.current)
      silence.current = window.setTimeout(() => r.stop(), 2200)
    }
    r.onend = () => {
      if (recRef.current !== r) return
      recRef.current = null; clearTimeout(silence.current); setListening(false)
      if (heard) sendRef.current((base ? base + ' ' : '') + heard, true)
    }
    r.onerror = (ev: any) => { // eslint-disable-line
      if (recRef.current !== r) return
      setListening(false)
      if (ev.error === 'no-speech' || ev.error === 'aborted') return
      setMsgs((m) => [...m, { role: 'assistant', content: ev.error === 'not-allowed' ? 'Microphone is blocked. Allow it in the Chrome address bar and try again.' : ev.error === 'network' || ev.error === 'service-not-allowed' ? 'Voice needs the Chrome browser (not the VS Code tab) and an internet connection. You can type instead.' : `Voice input stopped (${ev.error}). Try again or type.`, src: 'System' }])
    }
    recRef.current = r; setListening(true)
    try { r.start() } catch { setListening(false) }
  }
  micRef.current = mic

  return (
    <section className="card chat">
      <h2>ASTRA AI</h2>
      {ai === '' && <p className="note">Basic mode: ASTRA is using built-in replies, so it will sound scripted. Connect an AI key in the .env file for natural conversation (see README).</p>}
      <div className="log" aria-live="polite">
        <div className="msg a"><p>{entries.length ? "Hi, I'm ASTRA. Ask about your readings or trends, or just tell me what's going on." : "Hi, I'm ASTRA, your space health assistant. How are you feeling today? Nothing's logged yet, so we're starting fresh. Tell me what's going on, or log a first reading in Health Data."}</p></div>
        {msgs.map((m, i) => <div key={i} className={'msg ' + (m.role === 'user' ? 'u' : 'a')}><p className="pre">{m.content}</p>{m.src && <small>{m.src}</small>}</div>)}
        {busy && <div className="msg a"><p>ASTRA is thinking...</p></div>}
        <div ref={end} />
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type, or tap Speak and just talk / Écrivez ou parlez" aria-label="Message to ASTRA" maxLength={500} />
        <button type="submit" className="btn primary" disabled={busy}>Send</button>
        <button type="button" className={'btn' + (listening ? ' on' : '')} onClick={mic} aria-pressed={listening}>{listening ? 'Listening... tap to finish' : 'Speak'}</button>
        <select className="vl" value={vlang} onChange={(e) => setVlang(e.target.value)} aria-label="Voice language"><option value="en-US">EN</option><option value="fr-FR">FR</option></select>
        <label className="chk"><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> Read replies aloud</label>
      </form>
      <p className="muted">ASTRA answers in English or French, matching the language you use. Pick EN or FR next to Speak so it listens in the right language. When you tap Speak, ASTRA waits until you pause for about 2 seconds, then answers out loud and listens again. ASTRA is a monitoring support tool, not a medical professional. Say "emergency" to open emergency support.</p>
    </section>
  )
}
