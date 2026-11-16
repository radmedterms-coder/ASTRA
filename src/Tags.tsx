import { Entry } from './store'

const LABEL: Record<string, [string, string]> = {
  nasa: ['NASA research informed', 'Wording follows NASA human-spaceflight research areas. No NASA astronaut measurements are shown.'],
  you: ['Your logged data', 'Uses the readings and symptoms you logged in this browser.'],
  sim: ['Simulated data', 'Fictional demo values. Not real astronaut or NASA data.'],
  proto: ['Prototype rule', 'A simple rule used in this prototype, not a clinical threshold.'],
  notval: ['Not clinically validated', 'Not validated for medical use.'],
  general: ['General guidance', 'General, hedged guidance. Follow your mission medical protocol.'],
}
const MAP: Record<string, string[]> = {
  Home: ['you'], 'ASTRA AI': ['you', 'general'], 'Body Systems': ['nasa', 'you'], 'Health Data': ['you'], Trends: ['you', 'proto', 'notval'],
  'Spaceflight Risks': ['nasa'], Recommendations: ['you', 'general', 'notval'], Sources: ['nasa'], Status: [], Settings: [],
}

export default function PageTags({ page, entries }: { page: string; entries: Entry[] }) {
  const keys = [...(MAP[page] ?? [])]
  if (entries.some((e) => e.sim) && keys.includes('you')) keys.push('sim')
  if (!keys.length) return null
  return (
    <div className="tags" aria-label="Data and evidence labels">
      {keys.map((k) => <span key={k} className={'tag ' + k} title={LABEL[k][1]}>{LABEL[k][0]}</span>)}
    </div>
  )
}
