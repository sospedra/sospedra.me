// Per-registration cost model for SIGE v2 on Gnosis Chain.
//
// Every constant below is an ESTIMATE, not a measurement. The two that move
// the answer most are ANCHOR_GAS and the storage figure, and both should be
// replaced with real numbers from a spike before anyone quotes this.

const EUR_PER_XDAI = 0.92 // xDAI tracks USD; EUR/USD assumed ~1.08
const GAS_PRICE_GWEI = 2 // Gnosis typical; 1 to 5 is the usual band

const ANCHOR_GAS = 50_000 // store a 32-byte root + emit an event
const UNSEAL_REQUEST_GAS = 120_000 // commitment, justification hash, fields

const RECORD_BYTES = 50_000 // v2 enrollment record, ESTIMATED
const EUR_PER_GB_MONTH = 0.021 // object storage
const CPU_SECONDS_PER_REG = 0.3 // verify credential proof + cut-and-choose
const EUR_PER_VCPU_HOUR = 0.037

const UNSEAL_RATE = 0.001 // fraction of users unsealed per year

function txEur(gas: number): number {
  return gas * GAS_PRICE_GWEI * 1e-9 * EUR_PER_XDAI
}

type Policy = { label: string; batchSize: number; maxWaitHours: number }

// Real systems anchor on "K records OR T elapsed, whichever comes first",
// because a pure size trigger leaves early users unanchored for months.
function anchorsPerYear(regs: number, p: Policy): number {
  const bySize = regs / p.batchSize
  const byTime = 8760 / p.maxWaitHours
  return Math.max(bySize, byTime)
}

const POLICIES: Policy[] = [
  { label: 'every 100 regs or 1h', batchSize: 100, maxWaitHours: 1 },
  { label: 'every 1k regs or 1h', batchSize: 1_000, maxWaitHours: 1 },
  { label: 'every 1k regs or 24h', batchSize: 1_000, maxWaitHours: 24 },
  { label: 'every 10k regs or 24h', batchSize: 10_000, maxWaitHours: 24 },
  { label: 'every 10k regs or 168h', batchSize: 10_000, maxWaitHours: 168 },
]

const VOLUMES = [1_000, 10_000, 100_000, 1_000_000, 10_000_000]

const storageEurPerReg = (RECORD_BYTES / 1e9) * EUR_PER_GB_MONTH * 12
const cpuEurPerReg = (CPU_SECONDS_PER_REG / 3600) * EUR_PER_VCPU_HOUR
const unsealEurPerReg = UNSEAL_RATE * txEur(UNSEAL_REQUEST_GAS)

function eur(n: number): string {
  if (n >= 0.01) return `€${n.toFixed(4)}`
  return `€${n.toExponential(2)}`
}

process.stdout.write(`${'CLAVE cost per registration, Gnosis Chain'}\n`)
process.stdout.write(
  `anchor tx ${eur(txEur(ANCHOR_GAS))}  |  storage/yr ${eur(storageEurPerReg)}  |  cpu ${eur(cpuEurPerReg)}  |  unseal amortised ${eur(unsealEurPerReg)}\n`,
)
process.stdout.write('\n')

const head = [
  'policy'.padEnd(24),
  ...VOLUMES.map((v) => `${v / 1000}k`.padStart(12)),
]
process.stdout.write(`${head.join('')}\n`)

for (const p of POLICIES) {
  const cells = VOLUMES.map((regs) => {
    const anchors = anchorsPerYear(regs, p)
    const chainPerReg = (anchors * txEur(ANCHOR_GAS)) / regs
    const total =
      chainPerReg + storageEurPerReg + cpuEurPerReg + unsealEurPerReg
    return eur(total).padStart(12)
  })
  process.stdout.write(`${[p.label.padEnd(24), ...cells].join('')}\n`)
}

process.stdout.write('\n')
process.stdout.write(`${'Chain share of the total, same grid'}\n`)
process.stdout.write(`${head.join('')}\n`)
for (const p of POLICIES) {
  const cells = VOLUMES.map((regs) => {
    const anchors = anchorsPerYear(regs, p)
    const chainPerReg = (anchors * txEur(ANCHOR_GAS)) / regs
    const total =
      chainPerReg + storageEurPerReg + cpuEurPerReg + unsealEurPerReg
    return `${((chainPerReg / total) * 100).toFixed(1)}%`.padStart(12)
  })
  process.stdout.write(`${[p.label.padEnd(24), ...cells].join('')}\n`)
}

process.stdout.write('\n')
process.stdout.write(`${'Absolute annual chain spend (all registrations)'}\n`)
process.stdout.write(`${head.join('')}\n`)
for (const p of POLICIES) {
  const cells = VOLUMES.map((regs) => {
    const anchors = anchorsPerYear(regs, p)
    return `€${(anchors * txEur(ANCHOR_GAS)).toFixed(2)}`.padStart(12)
  })
  process.stdout.write(`${[p.label.padEnd(24), ...cells].join('')}\n`)
}
