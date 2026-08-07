import { scenario as s01 } from './s01-author-concurrency.ts'
import { scenario as s02 } from './s02-payload-tampering.ts'
import { scenario as s03 } from './s03-author-replay.ts'
import { scenario as s04 } from './s04-honest-query.ts'
import { scenario as s05 } from './s05-hidden-algorithm.ts'
import { scenario as s06 } from './s06-shared-proof.ts'
import { scenario as s07 } from './s07-missing-signature-nonce-replay.ts'
import { scenario as s08 } from './s08-database-swap.ts'
import { scenario as s09 } from './s09-env-var-semantics.ts'
import { scenario as s10 } from './s10-returning-rollback.ts'
import { scenario as s11 } from './s11-isolated-freeze.ts'
import { scenario as s12 } from './s12-head-conflict-gossip.ts'
import { scenario as s13 } from './s13-stale-head.ts'
import { scenario as s14 } from './s14-omitted-write.ts'
import { scenario as s15 } from './s15-missed-proof-deadline.ts'
import { scenario as s16 } from './s16-float-config.ts'
import { scenario as s17 } from './s17-config-timelock.ts'
import { scenario as s18 } from './s18-early-migration.ts'
import { scenario as s19 } from './s19-migration-chain.ts'
import { scenario as s20 } from './s20-key-rotation.ts'
import { scenario as s21 } from './s21-first-contact-fork.ts'
import { scenario as s22 } from './s22-authorized-false-data.ts'
import { scenario as s23 } from './s23-forged-governance.ts'
import type { Scenario } from './trace.ts'

export const scenarios: Scenario[] = [
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
  s08,
  s09,
  s10,
  s11,
  s12,
  s13,
  s14,
  s15,
  s16,
  s17,
  s18,
  s19,
  s20,
  s21,
  s22,
  s23,
]
