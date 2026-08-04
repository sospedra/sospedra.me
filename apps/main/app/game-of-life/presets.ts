import { type CellSet, parseRle } from './engine'

type LifePresetDetails = {
  id: string
  title: string
  family: string
  note: string
  sourceHref: string
}

export type InteractiveLifePreset = LifePresetDetails & {
  kind: 'interactive'
  cells: CellSet
}

export type ReferenceLifePreset = LifePresetDetails & {
  kind: 'reference'
  actionLabel: string
}

export type LifePreset = InteractiveLifePreset | ReferenceLifePreset

const definePreset = (
  preset: LifePresetDetails & { rle: string },
): InteractiveLifePreset => {
  const { rle, ...details } = preset
  return { ...details, kind: 'interactive', cells: parseRle(rle) }
}

const defineReference = (
  preset: LifePresetDetails & { actionLabel?: string },
): ReferenceLifePreset => {
  const { actionLabel = 'Open dossier', ...details } = preset
  return { ...details, kind: 'reference', actionLabel }
}

const R_PENTOMINO = definePreset({
  id: 'r-pentomino',
  title: 'R-pentomino',
  family: 'Methuselah · 1,103 gen',
  note: 'Five cells with a famously long, chaotic afterlife.',
  rle: 'b2o$2o$bo!',
  sourceHref: 'https://conwaylife.com/wiki/R-pentomino',
})

export const LIFE_PRESETS: readonly LifePreset[] = [
  R_PENTOMINO,
  definePreset({
    id: 'acorn',
    title: 'Acorn',
    family: 'Methuselah · 5,206 gen',
    note: 'Seven cells grow into an oak-sized field of ash and gliders.',
    rle: 'bo$3bo$2o2b3o!',
    sourceHref: 'https://conwaylife.com/wiki/Acorn',
  }),
  definePreset({
    id: 'diehard',
    title: 'Diehard',
    family: 'Diehard · 130 gen',
    note: 'Seven cells fight for 130 generations, then vanish completely.',
    rle: '6bo$2o$bo3b3o!',
    sourceHref: 'https://conwaylife.com/wiki/Die_hard',
  }),
  definePreset({
    id: 'gosper-glider-gun',
    title: 'Gosper glider gun',
    family: 'Gun · period 30',
    note: 'The first finite pattern proved to grow without bound.',
    rle: '24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!',
    sourceHref: 'https://conwaylife.com/wiki/Gosper_glider_gun',
  }),
  definePreset({
    id: 'pulsar',
    title: 'Pulsar',
    family: 'Oscillator · period 3',
    note: 'A radial 48-cell heartbeat expanding through three phases.',
    rle: '2b3o3b3o2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!',
    sourceHref: 'https://conwaylife.com/wiki/Pulsar',
  }),
  definePreset({
    id: 'pentadecathlon',
    title: 'Pentadecathlon',
    family: 'Oscillator · period 15',
    note: 'A compact twelve-cell engine with a long rhythmic cycle.',
    rle: '2bo4bo2b$2ob4ob2o$2bo4bo!',
    sourceHref: 'https://conwaylife.com/wiki/Pentadecathlon',
  }),
  definePreset({
    id: 'glider-collision',
    title: 'Glider collision',
    family: 'Two-glider mess · 530 gen',
    note: 'Two angled gliders erupt into oscillators, ships, and debris.',
    rle: '2bo$obo$b2o$11bo$9b2o$10b2o!',
    sourceHref: 'https://conwaylife.com/wiki/2-glider_mess',
  }),
  definePreset({
    id: 'lwss',
    title: 'Lightweight spaceship',
    family: 'Spaceship · c/2 · p4',
    note: 'Nine cells cruise horizontally at half the speed of light.',
    rle: 'bo2bo$o$o3bo$4o!',
    sourceHref: 'https://conwaylife.com/wiki/Lightweight_spaceship',
  }),
  definePreset({
    id: 'switch-engine',
    title: 'Switch engine',
    family: 'Engine · c/12',
    note: 'An unstable diagonal engine dragging a moving trail of debris.',
    rle: 'bobo$o$bo2bo$3b3o!',
    sourceHref: 'https://conwaylife.com/wiki/Switch_engine',
  }),
  definePreset({
    id: 'infinite-growth-seed',
    title: 'Infinite-growth seed',
    family: 'Linear growth · 10 cells',
    note: 'Callahan’s minimal seed eventually builds a block-laying engine.',
    rle: '6bob$4bob2o$4bobob$4bo3b$2bo5b$obo!',
    sourceHref: 'https://conwaylife.com/wiki/Linear-growth_pattern',
  }),
  definePreset({
    id: 'breeder',
    title: 'Riley’s breeder',
    family: 'Quadratic growth · 38 cells',
    note: 'A machine that creates engines that create an endless wake.',
    rle: '133bo$134bo$130bo3bo$131b4o3$130bo$131bo$132bo$132bo$131b2o4$133bo$134bo$130bo3bo$131b4o9$96bo$97bo$93bo3bo$94b4o8$3bo$4bo$o3bo$b4o!',
    sourceHref: 'https://conwaylife.com/wiki/Riley%27s_breeder',
  }),
  defineReference({
    id: 'otca-metapixel',
    title: 'OTCA metapixel',
    family: 'Metacell · 64,691 live',
    note: 'One Life cell built from sixty-four thousand others. HashLife scale.',
    sourceHref: 'https://conwaylife.com/wiki/OTCA_metapixel',
    actionLabel: 'Open metacell',
  }),
  defineReference({
    id: 'geminoid-constructors',
    title: 'Geminoid constructors',
    family: 'Constructor family · HashLife',
    note: 'Glider-timed programs that build copies of their own circuitry.',
    sourceHref: 'https://conwaylife.com/ref/lexicon/lex_g.htm#geminoid',
    actionLabel: 'Open constructor',
  }),
]

export const DEFAULT_PRESET = R_PENTOMINO

export const presetById = (id: string): LifePreset | undefined =>
  LIFE_PRESETS.find((preset) => preset.id === id)
