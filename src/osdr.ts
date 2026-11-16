import type { SysKey } from './store'

export interface Study { id: string; title: string; organism: string; type: string; flight: string; mission: string; material: string; pub: string; summary: string }

// Search term per body system, sent to the NASA OSDR Search API.
export const TERMS: Record<SysKey, string> = {
  skeletal: 'bone', muscular: 'skeletal muscle', cardiovascular: 'cardiovascular', nervous: 'brain', respiratory: 'lung', hematological: 'blood',
}
export const searchLink = (term: string) => `https://osdr.nasa.gov/bio/repo/search?q=${encodeURIComponent(term)}&data_source=cgene`
export const recordLink = (id: string) => `https://osdr.nasa.gov/osdr/data/osd/meta/${id.replace(/\D/g, '')}`

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toStudy(s: any): Study {
  const d = String(s['Study Description'] ?? '')
  return {
    id: String(s['Accession'] ?? s['Study Identifier'] ?? ''), title: String(s['Study Title'] ?? ''), organism: String(s['organism'] ?? ''),
    type: String(s['Project Type'] ?? ''), flight: String(s['Flight Program'] ?? ''), mission: String(s['Mission']?.Name ?? ''),
    material: String(s['Material Type'] ?? ''), pub: String(s['Study Publication Title'] ?? ''), summary: d.length > 280 ? d.slice(0, 277) + '...' : d,
  }
}

export async function searchOSDR(term: string, size = 3): Promise<{ total: number; studies: Study[] }> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(`https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(term)}&from=0&size=${size}&type=cgene`, { signal: ctl.signal })
    if (!r.ok) throw new Error('OSDR ' + r.status)
    const j = await r.json()
    const hits: any[] = j?.hits?.hits ?? []
    const studies = hits.map((h) => toStudy(h._source ?? {})).filter((x) => x.id && x.title)
    if (!studies.length) throw new Error('No records')
    return { total: Number(j?.hits?.total ?? studies.length), studies }
  } finally { clearTimeout(timer) }
}

// Saved copies of real OSDR records (retrieved Nov 2026), used only if the live lookup fails.
// Summaries below are paraphrased from each record, not copied.
const S342: Study = { id: 'OSD-342', title: 'Targeting myostatin/activin A protects against skeletal muscle and bone loss during spaceflight [plasma proteomics]', organism: 'Mus musculus', type: 'Spaceflight Study', flight: 'International Space Station (ISS)', mission: 'SpaceX-19', material: 'Plasma', pub: 'Targeting myostatin/activin A protects against skeletal muscle and bone loss during spaceflight', summary: 'Mice flown to the ISS for 33 days lost significant muscle and bone mass. The study tested blocking myostatin/activin A signaling as a way to protect both.' }
const S18: Study = { id: 'OSD-18', title: 'Microarray Profile of Gene Expression during Osteoclast Differentiation in Modeled Microgravity', organism: 'Mus musculus', type: 'Ground Study', flight: '', mission: '', material: 'Cells', pub: 'Microarray profile of gene expression during osteoclast differentiation in modelled microgravity.', summary: 'Cells grown in a NASA-developed simulated-microgravity vessel showed changes in genes tied to bone-resorbing cells (osteoclasts), relevant to bone loss in spaceflight.' }
const S467: Study = { id: 'OSD-467', title: 'Transcriptomic profiling of cortical bone from hindlimb unloaded mice', organism: 'Mus musculus', type: 'Ground Study', flight: '', mission: '', material: 'Cortical Bone', pub: 'RNAseq and RNA molecular barcoding reveal differential gene expression in cortical bone following hindlimb unloading in female mice.', summary: 'RNA sequencing of cortical bone from mice kept off their hind limbs for 7 days (a ground model of reduced loading), compared with normal weight bearing.' }
export const SAVED: Partial<Record<SysKey, { total: number; studies: Study[] }>> = {
  skeletal: { total: 67, studies: [S342, S18, S467] },
  muscular: { total: 1, studies: [S342] },
}
