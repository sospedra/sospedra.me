import { hex } from '../protocol/bytes.ts'
import type { Taxonomy } from '../protocol/evidence.ts'
import type { CheckLog } from '../protocol/verify.ts'

export type Actor = 'author' | 'server' | 'client' | 'attacker' | 'peer'

export type VerdictKind = 'ACCEPT' | 'REJECT' | 'EVIDENCE' | 'LIMITATION'

export type TraceObject = {
  name: string
  type: string
  hex: string
  hash?: string
  decoded: Record<string, string>
}

export type TraceStep = {
  actor: Actor
  kind: 'act' | 'object' | 'check'
  label: string
  detail?: string
  objects?: TraceObject[]
  check?: { name: string; pass: boolean; error?: string }
}

export type Verdict = {
  kind: VerdictKind
  error?: string
  note: string
}

export type Trace = {
  steps: TraceStep[]
  verdict: Verdict
  checks?: CheckLog[]
}

export type Scenario = {
  meta: {
    id: number
    slug: string
    title: string
    taxonomy: Taxonomy
    specRefs: string[]
    expected: string
  }
  run(): Trace
}

export function obj(
  name: string,
  type: string,
  bytes: Uint8Array,
  decoded: Record<string, string>,
): TraceObject {
  return { name, type, hex: hex(bytes), decoded }
}
