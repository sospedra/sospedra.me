import { z } from 'zod'

// coordinate arrays hold millions of numbers from a first-party asset: presence-only check
const flatCoords = z.custom<number[]>(Array.isArray)

const gridFields = {
  ox: z.number(),
  oz: z.number(),
  hmin: z.number(),
  hmax: z.number(),
  cellX: z.number().positive(),
  cellZ: z.number().positive(),
}

const contourLevelSchema = z.object({
  lv: z.number(),
  mj: z.union([z.literal(0), z.literal(1)]),
  p: z.array(flatCoords),
})

const peakSchema = z.object({
  name: z.string(),
  elev: z.number(),
  i: z.number().int(),
  j: z.number().int(),
})

const mountainSchema = z.object({
  id: z.string(),
  title: z.string(),
  elev: z.number(),
  cap: z.string(),
  ...gridFields,
  peaks: z.array(peakSchema).min(1),
  contours: z.array(contourLevelSchema),
})

export const terrainMetaSchema = z.object({
  v: z.literal(2),
  grid: z.number().int().positive(),
  base: z.object({
    nx: z.number().int().positive(),
    nz: z.number().int().positive(),
    ...gridFields,
  }),
  mountains: z.array(mountainSchema).min(1),
  borders: z.array(z.object({ id: z.string(), rings: z.array(flatCoords) })),
  cities: z.array(z.object({ name: z.string(), x: z.number(), z: z.number() })),
  contours: z.array(contourLevelSchema),
  rivers: z.array(z.object({ id: z.string(), p: flatCoords })),
})

export type TerrainMeta = z.infer<typeof terrainMetaSchema>
export type TerrainData = Omit<TerrainMeta, 'base' | 'mountains'> & {
  base: TerrainMeta['base'] & { q: Uint16Array }
  mountains: Array<TerrainMeta['mountains'][number] & { q: Uint16Array }>
}
export type Mountain = TerrainData['mountains'][number]
export type ContourLevel = z.infer<typeof contourLevelSchema>
export type City = TerrainData['cities'][number]
