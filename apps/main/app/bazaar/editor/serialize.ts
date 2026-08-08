import { z } from 'zod'
import type { DecorDoc, DecorNode } from '../decor'
import { STALL_SCENES } from '../stalls-manifest'

const regime = z.enum(['m', 'b', 'a', 'w'])

const stallId = z
  .string()
  .refine((id) => id in STALL_SCENES, { message: 'unknown stall' })

const desktopFloor = z
  .object({ stalls: z.array(stallId).min(1), stairsRight: z.boolean() })
  .strict()

const mobileFloor = z
  .object({ stalls: z.array(stallId).min(1).max(2), smRight: z.boolean() })
  .strict()

const floorsConfig = z
  .object({ desktop: z.array(desktopFloor), mobile: z.array(mobileFloor) })
  .strict()

const chromePatch = z
  .object({
    translate: z.string(),
    scale: z.string(),
    zIndex: z.string(),
    filter: z.string(),
    opacity: z.string(),
    veil: z.string(),
    backgroundImage: z.string(),
    display: z.string(),
    wf: z.string(),
    shadowOp: z.string(),
    shadowStop: z.string(),
    shadowH: z.string(),
    shadowY: z.string(),
    shadowInset: z.string(),
  })
  .partial()
  .strict()

const chromeScopedKey = z
  .string()
  .refine((key) => key.endsWith('@m') || key.endsWith('@d'), {
    message: 'chrome keys end in @m or @d',
  })

const chromeMap = z.record(chromeScopedKey, chromePatch)

const placementPatch = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    sx: z.number(),
    sy: z.number(),
  })
  .partial()
  .strict()

const decorNode = z
  .object({
    id: z.string().regex(/^n\d+$/),
    kind: z.enum(['deco', 'arch', 'glow', 'shadow']),
    ref: z.string().min(1),
    host: z.string().min(1),
    corner: z.enum(['tl', 'tr', 'bl', 'br']),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(),
    h: z.number(),
    sx: z.number().optional(),
    sy: z.number().optional(),
    flip: z.boolean().optional(),
    z: z.number().int(),
    bright: z.number().optional(),
    opacity: z.number().optional(),
    pulse: z.boolean().optional(),
    shade: z.boolean().optional(),
    hide: z.array(regime).optional(),
    over: z.partialRecord(regime, placementPatch).optional(),
  })
  .strict()

export const decorDocSchema = z
  .object({
    counter: z.number().int().nonnegative(),
    nodes: z.array(decorNode),
    floors: floorsConfig.optional(),
    chrome: chromeMap.optional(),
  })
  .strict()

const NODE_KEYS = [
  'id',
  'kind',
  'ref',
  'host',
  'corner',
  'x',
  'y',
  'w',
  'h',
  'sx',
  'sy',
  'flip',
  'z',
  'bright',
  'opacity',
  'pulse',
  'shade',
  'hide',
  'over',
] satisfies (keyof DecorNode)[]

const orderKeys = (node: DecorNode) =>
  Object.fromEntries(
    NODE_KEYS.filter((key) => node[key] !== undefined).map((key) => [
      key,
      node[key],
    ]),
  )

/** document order is render order: serialize verbatim, stable keys */
export const serializeDoc = (doc: DecorDoc): string => {
  const body = JSON.stringify(
    {
      counter: doc.counter,
      ...(doc.floors ? { floors: doc.floors } : {}),
      ...(doc.chrome ? { chrome: doc.chrome } : {}),
      nodes: doc.nodes.map(orderKeys),
    },
    null,
    2,
  )
  return `${body}\n`
}
