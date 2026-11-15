import { Entry, MetricKey, METRICS, latest, series, trend, mlabel, munit } from './store'

export interface Rec { kind: 'attention' | 'routine' | 'log'; title: string; why: string; todo: string[]; ask: string[] }

const span = (e: Entry[], k: MetricKey, n: number) => {
  const s = series(e, k).slice(-n)
  return `${s[0].value} to ${s[s.length - 1].value} ${munit(k)} between day ${s[0].day} and day ${s[s.length - 1].day}`
}

// Personalised, non-prescriptive suggestions. Vitamins, minerals, supplements, medication and training changes
// appear only as topics to ask the crew medical officer about, never as instructions or doses.
export function buildRecs(e: Entry[], day: number): Rec[] {
  const out: Rec[] = []
  const att = (title: string, why: string, todo: string[], ask: string[]) => out.push({ kind: 'attention', title, why, todo, ask })

  let t = trend(e, 'muscle')
  if (t?.dir === 'falling') att('Your muscle strength is trending down',
    `Your strength assessment went from ${span(e, 'muscle', t.n)}, a fall of about ${Math.abs(t.pct)}% over your last ${t.n} entries. This is a pattern to check, not a diagnosis.`,
    ['Do every scheduled exercise session in full, and note any you skipped or cut short.', 'Log a strength assessment on schedule so ASTRA can see if the trend continues.', 'Report new weakness, cramps or pain, and where you feel it.'],
    ['Whether my exercise prescription should change', 'Whether my calorie and protein intake match my training load', 'Whether any vitamin or mineral levels should be checked'])

  t = trend(e, 'ucal')
  if (t?.dir === 'rising') att('Your urinary calcium is climbing',
    `Your 24 hour urinary calcium went from ${span(e, 'ucal', t.n)}, up about ${Math.abs(t.pct)}%. It can reflect bone turnover, diet and hydration, so this is a prompt to check and not proof of bone loss.`,
    ['Keep up your weight-bearing and resistive exercise sessions, which are part of the bone countermeasure plan.', 'Drink your planned fluids through the day. Low fluid with high urinary calcium can raise kidney stone risk.', 'Complete 24 hour urine collections on schedule, and note anything different that week (food, exercise, fluids).'],
    ['Whether my vitamin D and calcium intake and levels should be reviewed', 'Whether I need a kidney stone risk check', 'Whether my salt and protein intake could be playing a part'])

  t = trend(e, 'bone')
  if (t?.dir === 'falling') att('Your bone density assessment is trending down',
    `It went from ${span(e, 'bone', t.n)}. Assessments can vary between scans, so a medical review is needed to know what it means.`,
    ['Stay consistent with your weight-bearing and resistive exercise protocol.', 'Log your 24 hour urine results on schedule so ASTRA can show both measures together.'],
    ['Whether a repeat bone assessment or follow-up is needed', 'Whether my vitamin D and calcium intake should be reviewed'])

  t = trend(e, 'sleep')
  if (t?.dir === 'falling') att('You are sleeping less',
    `Your sleep went from ${span(e, 'sleep', t.n)}. Schedule shifts, light, noise, workload and stress can all play a part.`,
    ['Keep a fixed sleep and wake time, even when the schedule shifts.', 'Dim lights and cut screen time for the hour before sleep.', 'Keep your sleep station dark, quiet and cool. Use an eye mask or ear plugs if you have them.', 'Write down what wakes you (noise, light, temperature, worries) and log it.'],
    ['Whether my work schedule or light exposure can be adjusted', 'What sleep support options exist in the medical kit and whether they suit me'])

  t = trend(e, 'hr')
  if (t) att(`Your heart rate readings are ${t.dir}`,
    `They went from ${span(e, 'hr', t.n)}. Activity, stress, fluids, caffeine and sleep all move heart rate, and spaceflight adaptation can too.`,
    ['Log your resting heart rate at the same time and in the same posture each day.', 'Note caffeine, exercise, stress and sleep before each reading.', 'Report palpitations, chest discomfort or dizziness straight away.'],
    ['Whether my fluid, exercise or cardiovascular check plan should change'])

  t = trend(e, 'spo2')
  if (t?.dir === 'falling') att('Your blood oxygen readings are trending down',
    `They went from ${span(e, 'spo2', t.n)}. Treat this as something to report today.`,
    ['Tell your crew medical officer today.', 'Check the cabin air readings and report any alarms or stuffy air.', 'Ask before doing hard exercise until you have been checked.'],
    ['Whether I need a breathing or air-quality check'])

  t = trend(e, 'rbc')
  if (t?.dir === 'falling') att('Your red blood cell count is trending down',
    `It went from ${span(e, 'rbc', t.n)}. A change in red cell measures is known to happen in spaceflight, but only a medical review can say what it means for you.`,
    ['Do your blood tests on schedule.', 'Report tiredness, breathlessness or dizziness.', 'Eat your planned meals and note when you skip them.'],
    ['Whether iron, B12 and folate levels should be checked', 'Whether my diet needs adjusting'])

  t = trend(e, 'wbc')
  if (t) att(`Your white blood cell count is ${t.dir}`,
    `It went from ${span(e, 'wbc', t.n)}. White cell counts shift with infection, stress and the closed environment, and need medical interpretation.`,
    ['Watch for fever, sore throat, cough or skin changes and log them.', 'Clean your hands and shared surfaces, and keep personal items separate.', 'Report symptoms early.'],
    ['Whether a repeat blood test is needed'])

  const sy = series(e, 'symptom').slice(-1)[0]
  if (sy && day - sy.day <= 14) out.push({ kind: sy.value >= 4 ? 'attention' : 'routine', title: `Follow up on: ${sy.note}`,
    why: `You reported this on day ${sy.day} (severity ${sy.value} out of 5).`,
    todo: ['Log how it is now: better, the same or worse.', 'Tell ASTRA more (when it started, how bad it is, what helps) so it can give better tips.', 'Tell your crew medical officer if it lasts or gets worse.'], ask: [] })

  const hasM = series(e, 'muscle').length > 0, hasB = series(e, 'bone').length > 0 || series(e, 'ucal').length > 0
  out.push({ kind: 'routine', title: 'Protect your muscles and bones with your exercise sessions',
    why: hasM || hasB ? 'You are logging muscle or bone measures, and reduced loading in microgravity can contribute to changes in both. Consistent exercise is the main countermeasure.' : 'Reduced loading in microgravity can contribute to muscle and bone changes, and consistent exercise is the main countermeasure.',
    todo: ['Do each prescribed session fully and on time.', 'Log that you did it and how hard it felt.', 'Report pain or injury instead of pushing through.'], ask: ['Whether my current prescription fits my results'] })

  if (trend(e, 'sleep')?.dir !== 'falling') out.push({ kind: 'routine', title: 'Keep a steady sleep routine',
    why: 'Sleep is often disrupted by schedule shifts, light and noise. Logging it lets ASTRA spot a pattern early.',
    todo: ['Keep consistent sleep and wake times.', 'Dim the lights before bed and use your sleep station.', 'Log your sleep hours each day.'], ask: [] })

  out.push({ kind: 'routine', title: 'Stay on your fluid and nutrition plan',
    why: 'Fluids and food affect energy, sleep, bones and kidney health, and supplies on board are limited.',
    todo: ['Drink your planned fluids across the day.', 'Eat your planned meals even when you are busy.', 'Tell the medical officer if your appetite changes.'],
    ask: ['Whether the vitamins and minerals in my mission plan are on track for me'] })

  if (day <= 7) out.push({ kind: 'routine', title: 'You are early in the mission: ease in',
    why: `You are on mission day ${day}. Motion sickness, head fullness and congestion are common while the body adapts.`,
    todo: ['Move slowly and deliberately, especially when turning your head.', 'Anchor yourself while working to reduce disorientation.', 'Report severe or lasting nausea, vomiting or headache.'], ask: ['What adaptation tips or kit options are available for me'] })
  else if (day >= 30) out.push({ kind: 'routine', title: 'Look after your mood and connection',
    why: `You are on mission day ${day}. Isolation and confinement over longer missions can affect mood and sleep.`,
    todo: ['Schedule regular calls with family and the psychological support team.', 'Share tasks and downtime with crewmates, and keep a few non-work routines.', 'Tell someone early if you feel low, anxious or irritable for several days.'], ask: [] })

  if (!e.length) out.push({ kind: 'log', title: 'Log your first readings', why: 'Nothing is logged yet, so ASTRA has no data to personalise from.',
    todo: ['Start with heart rate and sleep. They take a minute.', 'Add blood and 24 hour urine results when you have them.'], ask: [] })
  const over = METRICS.map((m) => ({ m, l: latest(e, m.key) })).filter((x) => x.l && day - x.l.day >= 7)
  if (over.length) out.push({ kind: 'log', title: 'Some measurements are due', why: `Last logged: ${over.map((x) => `${mlabel(x.m.key).toLowerCase()} (day ${x.l!.day})`).join(', ')}. The prototype assumes weekly assessments.`,
    todo: ['Log them in Health Data.'], ask: [] })
  return out
}
