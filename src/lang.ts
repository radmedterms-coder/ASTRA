import { Entry, MetricKey, series, trend, mlabel, munit } from './store'

export type Lang = 'en' | 'fr'

const FR = ['je', "j'ai", "j'avais", 'suis', 'ai', 'mal', 'tête', 'ma', 'mon', 'mes', 'le', 'la', 'les', 'un', 'une', 'des', 'est', 'et', 'pas', 'avec', 'depuis', 'bonjour', 'salut', 'bonsoir', 'merci', 'jambes', 'fatigué', 'fatiguée', 'douleur', 'dors', 'dormi', 'mangé', 'ça', "c'est", 'vous', 'tu', 'que', 'pour', 'dans', 'sur', 'du', 'au', 'très', 'aussi', 'comment', 'pourquoi', 'oui', 'non', 'faible', 'poitrine', 'respirer', 'urgence']
const EN = ['i', 'my', 'the', 'is', 'are', 'have', 'has', 'and', 'with', 'to', 'of', 'it', 'am', 'feel', 'feeling', 'pain', 'hurts', 'since', 'can', 'not', 'what', 'how', 'hi', 'hello', 'thanks', 'headache', 'legs', 'weak', 'sleep', 'slept', 'ate', 'eaten', 'today', 'yesterday', 'hours', 'days', 'chest', 'breathe']

// English or French only. Ties default to English.
export function detectLang(t: string): Lang {
  const s = ' ' + t.toLowerCase().replace(/[^\p{L}'\s]/gu, ' ') + ' '
  let fr = (s.match(/[àâçéèêëîïôûùüÿœ]/g) || []).length * 2
  for (const w of FR) if (s.includes(' ' + w + ' ')) fr++
  let en = 0
  for (const w of EN) if (s.includes(' ' + w + ' ')) en++
  return fr > en ? 'fr' : 'en'
}

const FR_LABEL: Record<MetricKey, string> = {
  hr: 'fréquence cardiaque', spo2: "saturation en oxygène", rbc: 'numération des globules rouges', wbc: 'numération des globules blancs',
  ucal: 'calcium urinaire (24 h)', sleep: 'durée de sommeil', muscle: 'évaluation de la force musculaire', bone: 'évaluation de la densité osseuse',
}
const FR_UNIT: Partial<Record<MetricKey, string>> = { sleep: 'heures', muscle: '% de votre base personnelle' }

const TOPICS: { re: RegExp; keys: MetricKey[]; en: string; fr: string }[] = [
  { re: /leg|weak|muscle|strength|thigh|calf|knee|jambe|faible|faiblesse|force|cuisse|mollet|genou/, keys: ['muscle', 'bone', 'ucal'],
    en: "Less loading in microgravity can cause muscle loss, but tiredness, poor sleep or illness can cause weakness too, so I can't say for sure.",
    fr: "Moins de charge en microgravité peut entraîner une perte musculaire, mais la fatigue, le manque de sommeil ou une maladie peuvent aussi causer de la faiblesse, donc je ne peux pas l'affirmer." },
  { re: /bone|calcium|skelet|hip|spine|\bos\b|squelet|hanche|colonne/, keys: ['bone', 'ucal'],
    en: "Urinary calcium can go up with bone breakdown, but diet and hydration move it too, so it doesn't prove bone loss.",
    fr: "Le calcium urinaire peut augmenter avec la perte osseuse, mais l'alimentation et l'hydratation jouent aussi, donc cela ne prouve pas une perte osseuse." },
  { re: /heart|pulse|chest|dizzy|c(o|œ)ur|pouls|poitrine|vertige|étourd/, keys: ['hr', 'spo2'],
    en: 'Heart rate shifts with activity, stress, hydration and sleep, and spaceflight adaptation can play a part.',
    fr: "La fréquence cardiaque varie avec l'activité, le stress, l'hydratation et le sommeil, et l'adaptation au vol spatial peut jouer un rôle." },
  { re: /sleep|tired|mood|stress|anxi|sommeil|dors|fatigu|humeur/, keys: ['sleep'],
    en: 'Sleep often takes a hit with isolation and schedule changes.',
    fr: "Le sommeil est souvent perturbé par l'isolement et les changements d'horaires." },
  { re: /blood|infect|immune|fever|sang|immun|fi(e|è)vre/, keys: ['rbc', 'wbc'],
    en: 'Blood counts need a medical review against proper reference ranges.',
    fr: "Les numérations sanguines doivent être revues par un médecin avec les bonnes valeurs de référence." },
  { re: /breath|lung|oxygen|respir|poumon|souffle|oxyg/, keys: ['spo2'],
    en: "Breathing and lung blood flow work differently in microgravity, and numbers alone can't tell me much about breathing trouble.",
    fr: "La respiration et la circulation pulmonaire fonctionnent différemment en microgravité, et les chiffres seuls ne disent pas grand-chose sur un problème respiratoire." },
]

// Built-in fallback when no AI is connected. Short, in English or French.
export function scripted(q: string, e: Entry[], lang: Lang): string {
  const fr = lang === 'fr'
  const t = q.toLowerCase().trim(), words = t.split(/\s+/).length
  if (/^(hi|hello|hey|yo|bonjour|salut|bonsoir|coucou|good (morning|afternoon|evening))\b/.test(t) && words <= 4)
    return fr ? "Salut. Comment vous sentez-vous ? Dites-moi ce qui se passe, ou posez une question sur vos mesures." : "Hey. How are you feeling? Tell me what's going on, or ask about your readings."
  if (/^(thanks|thank you|ok|okay|cool|got it|merci|d'accord)\b/.test(t) && words <= 4)
    return fr ? "Avec plaisir. Autre chose qui vous préoccupe ?" : 'Anytime. Anything else bothering you?'
  const topic = TOPICS.find((x) => x.re.test(t))
  if (!topic && words <= 2) return fr ? "Dites-m'en un peu plus. Qu'est-ce que vous remarquez, et où ?" : 'Tell me a bit more. What are you noticing, and where?'
  if (!e.length) return fr
    ? "Je n'ai encore aucune mesure enregistrée, donc je ne peux rien comparer. Où le ressentez-vous, et depuis quand ? Si cela empire, prévenez votre médecin de bord."
    : "I don't have any readings logged yet, so I can't compare anything. Where do you feel it, and when did it start? If it's getting worse, tell your medical officer."
  const keys = (topic ? topic.keys : (['hr', 'spo2', 'rbc', 'wbc', 'ucal', 'sleep', 'muscle', 'bone'] as MetricKey[])).filter((k) => series(e, k).length)
  const used = keys.slice(0, 3)
  const bits = used.map((k) => {
    const s = series(e, k), l = s[s.length - 1], tr = trend(e, k)
    if (fr) return `votre ${FR_LABEL[k]} est de ${l.value} ${FR_UNIT[k] ?? munit(k)} au jour ${l.day}${tr ? ` et elle est ${tr.dir === 'rising' ? 'en hausse' : 'en baisse'} d'environ ${Math.abs(tr.pct)} % sur ${tr.n} entrées` : ''}`
    return `your ${mlabel(k).toLowerCase()} is ${l.value} ${munit(k)} as of day ${l.day}${tr ? ` and has been ${tr.dir} about ${Math.abs(tr.pct)}% over ${tr.n} entries` : ''}`
  })
  const out: string[] = []
  if (fr) out.push(bits.length ? `D'après votre journal, ${bits.join('. Aussi, ')}.` : "Vous n'avez encore rien enregistré à ce sujet.")
  else out.push(bits.length ? `Looking at your log, ${bits.join('. Also, ')}.` : "You haven't logged anything related to that yet.")
  out.push(topic ? (fr ? topic.fr : topic.en) : fr ? "Je ne peux pas poser de diagnostic à partir de chiffres seuls." : "I can't diagnose from numbers alone.")
  const sym = series(e, 'symptom').slice(-1)[0]
  if (sym) out.push(fr ? `Vous avez aussi signalé « ${sym.note} » au jour ${sym.day}.` : `You also reported "${sym.note}" on day ${sym.day}.`)
  if (used.some((k) => series(e, k).some((x) => x.sim))) out.push(fr ? "Notez qu'il s'agit de données de démonstration simulées." : 'Note that this is simulated demo data.')
  out.push(fr ? "Parlez-en à votre médecin de bord et continuez à enregistrer. Si cela s'aggrave, contactez le personnel médical." : 'Mention it to your medical officer and keep logging. If it gets worse, contact medical personnel.')
  return out.join(' ')
}
