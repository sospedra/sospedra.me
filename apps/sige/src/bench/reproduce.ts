import { cpus, totalmem } from 'node:os'
import { encodeCbor } from '../core/cbor.ts'
import { chainedWork } from '../core/congestion.ts'
import { setupParams } from '../core/lhtlp.ts'
import { scalarCommitment } from '../core/shamir.ts'
import {
  proveVtd,
  solveVtd,
  soundnessBits,
  verifyVtd,
  worstCaseSolves,
} from '../core/vtd.ts'
import { vtdProofCbor } from '../core/vtd-cbor.ts'
import {
  CONGESTION_FLOOR,
  LHTLP_PRIME_BITS,
  VTD_PROFILE,
} from '../world/params.ts'
import { GENERIC } from '../world/profile.ts'
import { createWorld, enroll, performUnseal } from '../world/world.ts'

// Reproducibility harness. One command regenerates every number the paper
// cites, and prints the host so a reader can scale the timings.

export type Measurement = {
  name: string
  unit: string
  value: number
  note?: string
}

export type ReproduceReport = {
  host: {
    cpuModel: string
    cpuCount: number
    totalMemoryGb: number
    nodeVersion: string
  }
  measurements: Measurement[]
}

function timeMs<T>(fn: () => T): { ms: number; value: T } {
  const start = process.hrtime.bigint()
  const value = fn()
  return { ms: Number(process.hrtime.bigint() - start) / 1e6, value }
}

async function timeMsAsync<T>(
  fn: () => Promise<T>,
): Promise<{ ms: number; value: T }> {
  const start = process.hrtime.bigint()
  const value = await fn()
  return { ms: Number(process.hrtime.bigint() - start) / 1e6, value }
}

function hostInfo(): ReproduceReport['host'] {
  const list = cpus()
  return {
    cpuModel: list[0]?.model ?? 'unknown',
    cpuCount: list.length,
    totalMemoryGb: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    nodeVersion: process.version,
  }
}

function vtdProfileTable(): Measurement[] {
  const candidates = [
    { n: 24, k: 7, o: 6 },
    { n: 120, k: 25, o: 24 },
    { n: 126, k: 26, o: 25 },
    VTD_PROFILE,
  ]
  return candidates.flatMap((profile) => {
    const label = `n=${profile.n},k=${profile.k},o=${profile.o}`
    return [
      {
        name: `vtd.soundness_bits[${label}]`,
        unit: 'bits',
        value: Math.round(soundnessBits(profile) * 100) / 100,
      },
      {
        name: `vtd.worst_case_solves[${label}]`,
        unit: 'solves',
        value: worstCaseSolves(profile),
      },
    ]
  })
}

async function vtdTimings(): Promise<Measurement[]> {
  const { params } = setupParams(LHTLP_PRIME_BITS, 1000)
  const secret = 12345678901234567890n
  const hS = scalarCommitment(secret)

  const proved = timeMs(() => proveVtd(params, secret, VTD_PROFILE))
  const proof = proved.value
  const verified = timeMs(() =>
    verifyVtd(params, proof, { hS, profile: VTD_PROFILE }),
  )
  const solved = await timeMsAsync(() => solveVtd(params, proof))
  const proofBytes = encodeCbor(vtdProofCbor(proof)).length

  return [
    { name: 'vtd.prove', unit: 'ms', value: Math.round(proved.ms) },
    { name: 'vtd.verify', unit: 'ms', value: Math.round(verified.ms) },
    { name: 'vtd.solve', unit: 'ms', value: Math.round(solved.ms) },
    {
      name: 'vtd.proof_size',
      unit: 'bytes',
      value: proofBytes,
      note: `profile n=${VTD_PROFILE.n},k=${VTD_PROFILE.k},o=${VTD_PROFILE.o} at t=1000`,
    },
    {
      name: 'vtd.verify_is_valid',
      unit: 'bool',
      value: verified.value === null ? 1 : 0,
      note: verified.value ?? 'proof verified',
    },
  ]
}

// Difficulty is an iteration count, not leading zero bits, so the curve is
// measured at the published floor rather than at single digits.
function congestionCurve(): Measurement[] {
  let previous: Uint8Array = new Uint8Array(32)
  return [
    CONGESTION_FLOOR,
    CONGESTION_FLOOR * 2,
    CONGESTION_FLOOR * 4,
    CONGESTION_FLOOR * 8,
  ].map((difficulty) => {
    const leaf = new Uint8Array(32).fill(difficulty)
    const measured = timeMs(() => chainedWork(previous, leaf, difficulty))
    previous = new Uint8Array(measured.value.output)
    return {
      name: `congestion.difficulty_${difficulty}`,
      unit: 'ms',
      value: Math.round(measured.ms),
    }
  })
}

async function endToEnd(): Promise<Measurement[]> {
  const world = createWorld(GENERIC, { t: 1000 })
  const enrolled = timeMs(() =>
    enroll(world, 'DOC-REPRODUCE', {
      fullLegalName: 'Repro Subject',
      dateOfBirth: '1990-01-01',
      documentNumber: 'ID-REPRO',
    }),
  )
  const result = enrolled.value
  if ('error' in result) {
    return [{ name: 'e2e.enroll', unit: 'ms', value: -1, note: result.error }]
  }

  const unsealed = await timeMsAsync(() =>
    performUnseal(world, result.record, { skipDelay: true }),
  )
  const second = enroll(world, 'DOC-REPRODUCE-DELAY', {
    fullLegalName: 'Repro Delay',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-REPRO-2',
  })
  const withDelay =
    'error' in second
      ? { ms: -1, value: { ok: false } }
      : await timeMsAsync(() => performUnseal(world, second.record, {}))

  return [
    {
      name: 'e2e.enroll',
      unit: 'ms',
      value: Math.round(enrolled.ms),
      note: 'two tracks, both proofs generated and verified',
    },
    {
      name: 'e2e.unseal_no_delay',
      unit: 'ms',
      value: Math.round(unsealed.ms),
    },
    {
      name: 'e2e.unseal_with_delay',
      unit: 'ms',
      value: Math.round(withDelay.ms),
      note: withDelay.value.ok ? 'identity recovered' : 'refused',
    },
    {
      name: 'e2e.escrow_ciphertext_size',
      unit: 'bytes',
      value:
        result.record.tracks.standard.outer.ciphertext.length +
        result.record.tracks.standard.U.length,
    },
  ]
}

export async function reproduce(): Promise<ReproduceReport> {
  const measurements = [
    ...vtdProfileTable(),
    ...(await vtdTimings()),
    ...congestionCurve(),
    ...(await endToEnd()),
  ]
  return { host: hostInfo(), measurements }
}

function renderHuman(report: ReproduceReport): string {
  const lines = [
    'SIGE reproducibility report',
    '',
    `host   ${report.host.cpuModel} x${report.host.cpuCount}, ${report.host.totalMemoryGb} GB, node ${report.host.nodeVersion}`,
    '',
  ]
  const width = Math.max(...report.measurements.map((m) => m.name.length))
  for (const m of report.measurements) {
    const note = m.note ? `  # ${m.note}` : ''
    lines.push(`${m.name.padEnd(width)}  ${m.value} ${m.unit}${note}`)
  }
  lines.push('')
  lines.push(
    'Timings are host-specific. Soundness bits and sizes are not: they must reproduce exactly.',
  )
  return lines.join('\n')
}

if (import.meta.filename === process.argv[1]) {
  const report = await reproduce()
  const out = process.argv.includes('--json')
    ? JSON.stringify(report, null, 2)
    : renderHuman(report)
  process.stdout.write(`${out}\n`)
}
