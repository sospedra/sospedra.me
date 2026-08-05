import { z } from 'zod'
import type { DecorDoc, DecorNode } from '../decor'

const regime = z.enum(['m', 'b', 'a', 'w'])

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
    hide: z.array(regime).optional(),
    over: z.partialRecord(regime, placementPatch).optional(),
  })
  .strict()

export const decorDocSchema = z
  .object({
    counter: z.number().int().nonnegative(),
    nodes: z.array(decorNode),
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
    { counter: doc.counter, nodes: doc.nodes.map(orderKeys) },
    null,
    2,
  )
  return `${body}\n`
}
