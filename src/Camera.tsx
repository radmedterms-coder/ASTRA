import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'

export interface Pick { id: string; side?: 'left' | 'right' }
type P = { x: number; y: number }
type Cand = Pick & P

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const POSE = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const HAND = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const HOLD_MS = 1200

const mid = (a: P, b: P, t = 0.5): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// Landmark sides come from the pose model, so "left" is the person's own left even though the preview is mirrored.
function candidates(L: P[]): Cand[] {
  const sm = mid(L[11], L[12]), hm = mid(L[23], L[24])
  const c: Cand[] = [
    { id: 'head', ...L[0] },
    { id: 'neck', ...mid(L[0], sm, 0.65) },
    { id: 'chest', ...mid(sm, hm, 0.3) },
    { id: 'abdomen', ...mid(sm, hm, 0.7) },
  ]
  const S = [
    { side: 'left' as const, sh: 11, el: 13, wr: 15, hp: 23, kn: 25, an: 27, ft: 31 },
    { side: 'right' as const, sh: 12, el: 14, wr: 16, hp: 24, kn: 26, an: 28, ft: 32 },
  ]
  for (const s of S) {
    c.push(
      { id: 'shoulder', side: s.side, ...L[s.sh] },
      { id: 'upperarm', side: s.side, ...mid(L[s.sh], L[s.el]) },
      { id: 'forearm', side: s.side, ...mid(L[s.el], L[s.wr]) },
      { id: 'hip', side: s.side, ...L[s.hp] },
      { id: 'thigh', side: s.side, ...mid(L[s.hp], L[s.kn]) },
      { id: 'lowerleg', side: s.side, ...mid(L[s.kn], L[s.an]) },
      { id: 'foot', side: s.side, ...mid(L[s.an], L[s.ft]) },
    )
  }
  return c
}

function isPointing(H: P[]) {
  const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
  const w = H[0]
  return d(H[8], w) > d(H[6], w) * 1.1 && ([[12, 10], [16, 14], [20, 18]] as number[][]).every(([t, p]) => d(H[t], w) < d(H[p], w))
}

export const regionText = (p: Pick, label: string) => `${p.side ? p.side + ' ' : ''}${label.toLowerCase()}`

export default function Camera({ labelOf, onPick }: { labelOf: (id: string) => string; onPick: (p: Pick) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pose = useRef<PoseLandmarker | null>(null)
  const hand = useRef<HandLandmarker | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const raf = useRef(0)
  const paused = useRef(false)
  const hold = useRef<{ key: string; t: number } | null>(null)
  const [phase, setPhase] = useState<'off' | 'loading' | 'live'>('off')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [ask, setAsk] = useState<Pick | null>(null)

  function stop() {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    pose.current?.close(); hand.current?.close()
    pose.current = null; hand.current = null
    setPhase('off'); setAsk(null); setProgress(0); setMsg('')
  }
  useEffect(() => () => stop(), []) // eslint-disable-line

  async function start() {
    setErr(''); setPhase('loading')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available in this browser or context. Use Chrome on localhost or HTTPS.')
      const fs = await FilesetResolver.forVisionTasks(WASM)
      pose.current = await PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: POSE }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4, minTrackingConfidence: 0.4 })
      hand.current = await HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: HAND }, runningMode: 'VIDEO', numHands: 1 })
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      const v = video.current!
      v.srcObject = stream.current
      await v.play()
      setPhase('live'); setMsg('Stand back so your head and feet are visible, then point with one finger.')
      loop()
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      setErr(/denied|NotAllowed|Permission/i.test(m) ? 'Camera permission was denied. Allow camera access in the browser address bar, or use the clickable body instead.' : `Camera tracking could not start: ${m}. Use the clickable body instead.`)
      stop()
    }
  }

  function loop() {
    const v = video.current, cv = canvas.current
    if (!v || !cv || !pose.current || !hand.current) return
    const w = v.videoWidth, h = v.videoHeight
    if (w && h && !paused.current) {
      cv.width = w; cv.height = h
      const ctx = cv.getContext('2d')!
      ctx.clearRect(0, 0, w, h)
      const now = performance.now()
      const po = pose.current.detectForVideo(v, now)
      const ha = hand.current.detectForVideo(v, now)
      const L = po.landmarks[0], H = ha.landmarks[0]
      if (L) { ctx.fillStyle = 'rgba(94,224,255,0.55)'; for (const c of candidates(L)) { ctx.beginPath(); ctx.arc(c.x * w, c.y * h, 5, 0, 7); ctx.fill() } }
      let key = ''
      if (!L) setMsg('Body not found. Step back so your whole body is in view.')
      else if (!H) setMsg('Body found. Point at an area of concern with your index finger.')
      else if (!isPointing(H)) setMsg('Hand found. Extend only your index finger to point.')
      else {
        const tip = H[8]
        const T = Math.hypot((mid(L[11], L[12]).x - mid(L[23], L[24]).x) * w, (mid(L[11], L[12]).y - mid(L[23], L[24]).y) * h)
        let best: Cand | null = null, bd = Infinity
        for (const c of candidates(L)) {
          const d = Math.hypot((c.x - tip.x) * w, (c.y - tip.y) * h)
          if (d < bd) { bd = d; best = c }
        }
        ctx.fillStyle = '#5ee0ff'; ctx.beginPath(); ctx.arc(tip.x * w, tip.y * h, 8, 0, 7); ctx.fill()
        if (best && bd < T * 0.5) {
          key = best.id + (best.side ?? '')
          ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(best.x * w, best.y * h, 26, 0, 7); ctx.stroke()
          setMsg(`Pointing at: ${regionText(best, labelOf(best.id))}. Hold still.`)
          if (hold.current?.key !== key) hold.current = { key, t: now }
          const p = Math.min(1, (now - hold.current.t) / HOLD_MS)
          setProgress(Math.round(p * 10) / 10)
          if (p >= 1) { paused.current = true; setAsk({ id: best.id, side: best.side }); hold.current = null }
        } else setMsg('Pointing detected, but no body region is close enough.')
      }
      if (!key) { hold.current = null; setProgress(0) }
    }
    raf.current = requestAnimationFrame(loop)
  }

  const answer = (yes: boolean) => {
    if (yes && ask) { onPick(ask) }
    setAsk(null); paused.current = false; hold.current = null; setProgress(0)
  }

  return (
    <div className="cam">
      {phase === 'off' && (
        <div>
          <p>ASTRA can use your webcam to find the body region you point at. Video is processed in your browser only and is never uploaded or saved. The model files download once from public CDNs. Pointing is approximate and is not a diagnosis or emergency detector.</p>
          <ul className="muted"><li>Stand 2 to 3 metres back so your head and feet are in frame.</li><li>Use bright, even light and a plain background.</li><li>Point with one finger and hold still for about a second.</li><li>If tracking struggles, click the body map instead.</li></ul>
          <button className="btn primary" onClick={start}>Allow camera and start pointing</button>
        </div>
      )}
      {phase === 'loading' && <p role="status">Loading body and hand tracking. This can take a few seconds.</p>}
      <div className="camwrap" style={{ display: phase === 'live' ? 'block' : 'none' }}>
        <video ref={video} playsInline muted />
        <canvas ref={canvas} />
      </div>
      {phase === 'live' && (
        <div>
          <p role="status" aria-live="polite">{msg}</p>
          <div className="bar" aria-label="Hold progress"><div style={{ width: progress * 100 + '%' }} /></div>
          {ask && (
            <div className="confirm" role="alertdialog">
              <strong>Is this your {regionText(ask, labelOf(ask.id))}?</strong>
              <div><button className="btn primary" onClick={() => answer(true)}>Yes, open it</button> <button className="btn" onClick={() => answer(false)}>No, keep pointing</button></div>
            </div>
          )}
          <button className="btn" onClick={stop}>Turn camera off</button>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  )
}
