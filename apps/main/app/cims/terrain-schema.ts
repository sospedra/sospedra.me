import { z } from 'zod'

// coordinate arrays hold millions of numbers from a first-party asset: presence-only check
const flatCoords = z.custom<number[]>(Array.isArray)

const base64ByteLength = (b64: string): number => {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return (b64.length * 3) / 4 - padding
}

const gridFields = {
  ox: z.number(),
  oz: z.number(),
  hmin: z.number(),
  hmax: z.number(),
  cellX: z.number().positive(),
  cellZ: z.number().positive(),
  b64: z.string().min(4),
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

export const terrainSchema = z
  .object({
    grid: z.number().int().positive(),
    base: z.object({
      nx: z.number().int().positive(),
      nz: z.number().int().positive(),
      ...gridFields,
    }),
    mountains: z.array(mountainSchema).min(1),
    borders: z.array(z.object({ id: z.string(), rings: z.array(flatCoords) })),
    cities: z.array(
      z.object({ name: z.string(), x: z.number(), z: z.number() }),
    ),
    contours: z.array(contourLevelSchema),
    rivers: z.array(z.object({ id: z.string(), p: flatCoords })),
  })
  .superRefine((data, ctx) => {
    if (base64ByteLength(data.base.b64) !== data.base.nx * data.base.nz * 2) {
      ctx.addIssue({ code: 'custom', message: 'base grid length mismatch' })
    }
    const patchBytes = data.grid * data.grid * 2
    for (const mountain of data.mountains) {
      if (base64ByteLength(mountain.b64) !== patchBytes) {
        ctx.addIssue({
          code: 'custom',
          message: `mountain grid length mismatch: ${mountain.id}`,
        })
      }
    }
  })

export type TerrainData = z.infer<typeof terrainSchema>
export type Mountain = TerrainData['mountains'][number]
export type ContourLevel = z.infer<typeof contourLevelSchema>
export type City = TerrainData['cities'][number]
