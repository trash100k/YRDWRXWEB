export interface Beat {
  index: number
  id: string
  annotation: string
  subAnnotation: string
  objectionKilled: string
}

export const BEATS: Beat[] = [
  {
    index: 0,
    id: 'before',
    annotation: 'This is your Tuesday.',
    subAnnotation: 'A yard full of problems. Money left on the table.',
    objectionKilled: 'Awareness',
  },
  {
    index: 1,
    id: 'scan',
    annotation: 'AI that actually sees the yard.',
    subAnnotation: 'Cutty identifies every issue. Estimates time. Adds to Thursday.',
    objectionKilled: "I don't understand how the AI works",
  },
  {
    index: 2,
    id: 'jobcard',
    annotation: 'Quote built in seconds. Not minutes.',
    subAnnotation: 'Hedge trim · Aerate · Edge · Mulch — $365 + tax',
    objectionKilled: 'Does it generate real quotes',
  },
  {
    index: 3,
    id: 'route',
    annotation: 'Three jobs. One street. Route built automatically.',
    subAnnotation: "Johnson + 2 neighbors on Oak St. You didn't lift a finger.",
    objectionKilled: 'What about routing',
  },
  {
    index: 4,
    id: 'invoice',
    annotation: 'Paid before you left the driveway.',
    subAnnotation: 'Invoice #1042 — $365.00 — Payment received.',
    objectionKilled: 'How do I get paid faster',
  },
  {
    index: 5,
    id: 'crew',
    annotation: 'Your crew has the route.',
    subAnnotation: 'Marcus and Dani are en route. No training needed.',
    objectionKilled: "My crew won't use it",
  },
]

export interface YardLabel {
  id: string
  category: string
  value: string
  detail: string
  beatIndex: number
  position: [number, number, number]
  staggerMs: number
}

export const YARD_LABELS: YardLabel[] = [
  {
    id: 'hedge',
    category: 'OVERGROWN HEDGE · 11 DAYS PAST SCHEDULE',
    value: 'Estimated trim: 45 min',
    detail: 'Add to Thursday route · $120',
    beatIndex: 1,
    position: [-3.5, 2.8, -4.5],
    staggerMs: 0,
  },
  {
    id: 'bare',
    category: 'BARE PATCH · BACK LEFT CORNER',
    value: 'Aerate + overseed recommended',
    detail: '$85 add-on · 15 min',
    beatIndex: 1,
    position: [3.5, 1.8, 2.5],
    staggerMs: 120,
  },
  {
    id: 'edge',
    category: 'HOA EDGE VIOLATION · DRIVEWAY BORDER',
    value: 'Must correct by Friday',
    detail: '0.5" drift from curb · $40',
    beatIndex: 1,
    position: [-1.5, 1.4, 4.2],
    staggerMs: 240,
  },
  {
    id: 'mulch',
    category: 'MULCH BEDS · FADED',
    value: '2 yards needed · $120',
    detail: 'Can bundle with hedge job',
    beatIndex: 1,
    position: [-6.5, 1.8, -2],
    staggerMs: 360,
  },
]
