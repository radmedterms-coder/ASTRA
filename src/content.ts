import type { SysKey, MetricKey } from './store'

export interface Sys { label: string; structures: string; fn: string; effects: string; metrics: MetricKey[]; warn: string }
export const SYSTEMS: Record<SysKey, Sys> = {
  skeletal: { label: 'Skeletal', structures: 'Femur, tibia, fibula, pelvis, vertebrae, ribs, skull', fn: 'Support, organ protection, mineral storage, blood cell production in marrow.',
    effects: 'Reduced mechanical loading in microgravity can contribute to bone mineral density loss, especially in weight-bearing bones such as the hip and spine, and to increased bone resorption. Not every astronaut is affected equally.',
    metrics: ['bone', 'ucal'], warn: 'A rising urinary calcium trend or a falling bone density assessment should be reviewed by medical personnel. Urinary calcium alone does not prove bone loss.' },
  muscular: { label: 'Muscular', structures: 'Quadriceps, hamstrings, gluteals, calf muscles (gastrocnemius, soleus), core and back muscles, arm muscles', fn: 'Movement, posture, heat production.',
    effects: 'Reduced loading can contribute to loss of muscle mass and strength, particularly in postural and lower-limb muscles. Exercise countermeasures under mission medical protocols are used to limit this.',
    metrics: ['muscle'], warn: 'Persistent weakness or a falling strength assessment should be discussed with medical personnel. Symptoms alone cannot establish a cause.' },
  cardiovascular: { label: 'Cardiovascular', structures: 'Heart, arteries, veins, capillaries', fn: 'Circulates blood, oxygen and nutrients.',
    effects: 'Fluid shifts toward the head and reduced gravitational load can lead to cardiovascular adaptations, including changes in heart rate and blood pressure regulation. Possible radiation effects on the heart and vessels are still being studied.',
    metrics: ['hr'], warn: 'Unusual or sustained heart rate changes, chest pain or fainting should follow mission medical protocols.' },
  nervous: { label: 'Nervous', structures: 'Brain, spinal cord, peripheral nerves, vestibular system (inner ear)', fn: 'Controls movement, sensation, balance, cognition and sleep regulation.',
    effects: 'Spaceflight can change balance, spatial orientation and coordination. Isolation and confinement can affect mood, sleep and cognitive performance. Radiation effects on the nervous system are an area of ongoing research.',
    metrics: ['sleep'], warn: 'Persistent poor sleep, mood change, dizziness or confusion should be reported to medical personnel.' },
  respiratory: { label: 'Respiratory', structures: 'Lungs, airways, diaphragm', fn: 'Gas exchange: brings oxygen in and removes carbon dioxide.',
    effects: 'Breathing and the distribution of air and blood flow in the lungs differ in microgravity, and cabin air quality is monitored as part of crew health.',
    metrics: ['spo2'], warn: 'Shortness of breath or low oxygen saturation readings should follow mission medical protocols.' },
  hematological: { label: 'Hematological', structures: 'Red blood cells, white blood cells, platelets, plasma, bone marrow', fn: 'Oxygen transport, immune defence and clotting.',
    effects: 'Spaceflight is associated with changes in red blood cell measures and with immune system changes. Findings vary between individuals.',
    metrics: ['rbc', 'wbc'], warn: 'Changes in blood counts need interpretation by medical personnel alongside reference ranges and symptoms.' },
}

export const REGIONS: Record<string, { label: string; sided: boolean; structures: string; systems: SysKey[] }> = {
  head: { label: 'Head', sided: false, structures: 'Skull, brain, eyes, inner ear', systems: ['nervous', 'skeletal'] },
  neck: { label: 'Neck', sided: false, structures: 'Cervical spine, carotid arteries, neck muscles', systems: ['skeletal', 'cardiovascular', 'muscular'] },
  chest: { label: 'Chest', sided: false, structures: 'Ribs, sternum, heart, lungs', systems: ['cardiovascular', 'respiratory', 'skeletal'] },
  abdomen: { label: 'Abdomen', sided: false, structures: 'Lumbar spine, core muscles, digestive organs, kidneys', systems: ['muscular', 'skeletal'] },
  shoulder: { label: 'Shoulder', sided: true, structures: 'Clavicle, scapula, shoulder joint, deltoid', systems: ['muscular', 'skeletal'] },
  upperarm: { label: 'Upper arm', sided: true, structures: 'Humerus, biceps, triceps', systems: ['skeletal', 'muscular'] },
  forearm: { label: 'Forearm', sided: true, structures: 'Radius, ulna, forearm flexors and extensors', systems: ['skeletal', 'muscular'] },
  hip: { label: 'Hip', sided: true, structures: 'Pelvis, hip joint, gluteal muscles', systems: ['skeletal', 'muscular'] },
  thigh: { label: 'Thigh', sided: true, structures: 'Femur, quadriceps, hamstrings', systems: ['muscular', 'skeletal'] },
  lowerleg: { label: 'Lower leg', sided: true, structures: 'Tibia, fibula, gastrocnemius, soleus', systems: ['muscular', 'skeletal'] },
  foot: { label: 'Foot', sided: true, structures: 'Tarsals, metatarsals, plantar muscles', systems: ['skeletal', 'muscular'] },
}

export const RISKS = [
  { title: 'Microgravity and altered gravity', systems: 'Skeletal, muscular, cardiovascular, nervous', measures: 'Bone density, urinary calcium, muscle strength, heart rate',
    items: ['Possible bone mineral density reduction and increased bone resorption', 'Possible loss of muscle mass and strength', 'Cardiovascular adaptations, including fluid shifts', 'Changes in balance, spatial orientation, locomotion and coordination'] },
  { title: 'Space radiation', systems: 'All tissues, nervous, cardiovascular', measures: 'No direct measurement in this prototype (dosimetry is Planned)',
    items: ['Possible cellular and DNA damage', 'Increased long-term cancer risk', 'Possible effects on the nervous system', 'Possible cardiovascular effects'] },
  { title: 'Isolation and confinement', systems: 'Nervous, behavioural health', measures: 'Sleep duration, self-reported symptoms',
    items: ['Psychological stress and mood changes', 'Sleep disruption', 'Behavioural health concerns', 'Changes in cognitive performance'] },
  { title: 'Hostile closed environments', systems: 'Hematological (immune), respiratory', measures: 'White blood cell count, symptoms',
    items: ['Changes in microbial populations', 'Infection risk', 'Hygiene-related health concerns', 'Environmental factors affecting crew health'] },
  { title: 'Distance from Earth', systems: 'Whole crew health system', measures: 'Completeness and regularity of logging',
    items: ['Delayed communication', 'Limited immediate medical support', 'Reduced access to equipment and supplies', 'Greater importance of independent health monitoring'] },
]

export const SOURCES = [
  { title: 'NASA Open Science Data Repository (OSDR, includes GeneLab)', pub: 'NASA', url: 'https://osdr.nasa.gov', gives: 'Open spaceflight biology and omics datasets.', use: 'Background for Risks page (Planned: direct dataset integration)' },
  { title: 'Human Research Roadmap', pub: 'NASA Human Research Program', url: 'https://humanresearchroadmap.nasa.gov', gives: 'NASA-defined human health risks of spaceflight (bone, muscle, radiation, behavioural health, and more).', use: 'Structure and wording of the Risks page and Body Systems effects' },
  { title: 'Life Sciences Data Archive / Lifetime Surveillance of Astronaut Health', pub: 'NASA Johnson Space Center', url: 'https://lsda.jsc.nasa.gov', gives: 'Archive of life-sciences research data. Individual astronaut data is restricted.', use: 'Background only. No astronaut data is used in ASTRA.' },
  { title: 'NASA-STD-3001: Space Flight Human-System Standard', pub: 'NASA Office of the Chief Health and Medical Officer', url: 'https://www.nasa.gov/ochmo', gives: 'Health and medical standards for crewed missions.', use: 'Basis for deferring to mission medical protocols (TODO: confirm exact document link)' },
  { title: 'The NASA Twins Study: a multidimensional analysis of a year-long human spaceflight (Garrett-Bakelman et al.)', pub: 'Science 364(6436), eaau8650, 2019', url: 'https://www.science.org/doi/10.1126/science.aau8650', gives: 'Multi-system changes measured over a year in space for one astronaut compared with an Earth-bound twin.', use: 'Supports the idea of multi-measure longitudinal monitoring' },
]
