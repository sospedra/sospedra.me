import { open } from '../core/aead.ts'
import { bytesEqual, randomBytes, shortHex, toHex } from '../core/bytes.ts'
import { type CborValue, encodeCbor } from '../core/cbor.ts'
import { dhash, kdf } from '../core/hash.ts'
import { combineContributions, deriveContribution } from '../core/kem.ts'
import { detectEquivocation } from '../core/merkle.ts'
import { scalarCommitment } from '../core/shamir.ts'
import {
  proveVtd,
  solveVtd,
  soundnessBits,
  verifyVtd,
  worstCaseSolves,
} from '../core/vtd.ts'
import {
  type DocketRecord,
  reconcile,
  type UnsealSighting,
} from '../world/docket.ts'
import { CONGESTION_FLOOR, DELAY_T, tuned } from '../world/params.ts'
import type { AuthorityProfile } from '../world/profile.ts'
import { openAccountCommitment, parseLeaf } from '../world/records.ts'
import {
  activeEpoch,
  buildUnsealLeaf,
  createAuthorization,
  createWorld,
  type DemoWorld,
  deriveBothOutOfInterface,
  type Enrolled,
  enroll,
  enrollReusingProofNonce,
  enrollWithTamperedProof,
  escrowContext,
  issueOrder,
  openOuter,
  payDelayAndDecrypt,
  performUnseal,
  rotateEpoch,
  signHeadRecord,
  verifyCommitmentOpening,
  warrantGate,
} from '../world/world.ts'

export type DemoStep = {
  label: string
  ok: boolean
  detail?: string
}

export type StepLogger = (step: DemoStep) => void
export type ProgressLogger = (done: number, total: number) => void

export type DemoScenario = {
  id: string
  title: string
  tier: 'MATH' | 'CUSTODY' | 'ASSUMED' | 'MATH + CUSTODY' | 'CUSTODY + ASSUMED'
  summary: string
  instructions: string[]
  run(log: StepLogger, onProgress?: ProgressLogger): Promise<boolean>
}

const PERSON_A = {
  fullLegalName: 'Ada Voss',
  dateOfBirth: '1990-04-12',
  documentNumber: 'ID-A-4472',
}

const PERSON_B = {
  fullLegalName: 'Bo Rell',
  dateOfBirth: '1985-11-30',
  documentNumber: 'ID-B-9034',
}

function mustEnroll(
  world: DemoWorld,
  doc: string,
  attrs: typeof PERSON_A,
): Enrolled {
  const r = enroll(world, doc, attrs)
  if ('error' in r) throw new Error('unexpected enrollment refusal')
  return r
}

function stepper(log: StepLogger) {
  return (label: string, ok: boolean, detail?: string) =>
    log({ label, ok, detail })
}

function refusedBecause(reason: string | null, pattern: RegExp): boolean {
  return !!reason && pattern.test(reason)
}

function verifyTimingDetail(
  verifyMs: number,
  solveMs: number,
): string | undefined {
  if (verifyMs <= solveMs) return undefined
  return "verification's fixed elliptic-curve and modular-exponentiation cost does not shrink with a small t. test/vtd.test.ts asserts the parameter-independent form instead: across a tenfold t change, verify stays flat and solve time multiplies"
}

function weakProfileDetail(
  naiveAccepts: boolean,
  naiveVerifyResult: string | null,
): string {
  if (naiveAccepts) {
    return 'the same proof verifies clean if the verifier trusts the profile it declares, instead of the pinned one'
  }
  return `trusting the proof's own profile should also have accepted it, but did not: ${naiveVerifyResult}`
}

async function anchorSighting(
  world: DemoWorld,
  doc: string,
): Promise<UnsealSighting | null> {
  const enrolled = mustEnroll(world, doc, { ...PERSON_A, documentNumber: doc })
  const out = await performUnseal(world, enrolled.record, { skipDelay: true })
  if (!out.ok || !out.published) return null
  const leaf = parseLeaf(out.published.leafBytes)
  if (!leaf) return null
  return {
    authorizationHash: toHex(leaf.authorization_hash),
    anchorHeight: out.published.anchor.blockHeight,
  }
}

export function buildScenarios(profile: AuthorityProfile): DemoScenario[] {
  return [
    {
      id: 'enrollment',
      title: 'Enrollment stores no identity',
      tier: 'MATH',
      summary:
        'An account is admitted with a hiding commitment, an escrow ciphertext, and a document nullifier. The database row contains no name. The same document cannot enroll twice.',
      instructions: [
        'Run the demo.',
        'Check the stored record fields: commitment, ciphertext, nullifier. No name appears.',
        'Watch the second enrollment with the same document get refused.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const { record } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        log({
          label: 'Ada enrolled',
          ok: true,
          detail: `account ${shortHex(record.accountId)}`,
        })
        const stored = JSON.stringify({
          commitment: toHex(record.identityCommitment),
          nullifier: toHex(record.documentNullifier),
          ciphertext_hash: toHex(record.tracks.standard.ciphertextHash),
        })
        const leaks = stored.includes('Ada') || stored.includes('ID-A-4472')
        log({
          label: 'stored record contains no identity attribute',
          ok: !leaks,
        })
        const dup = enroll(world, 'DOC-A-4472', PERSON_B)
        const refused =
          'error' in dup && dup.error === 'CREDENTIAL_ALREADY_ENROLLED'
        log({
          label: 'second enrollment with the same document refused',
          ok: refused,
        })
        return !leaks && refused
      },
    },
    {
      id: 'unseal',
      title: 'Full supported unseal',
      tier: 'MATH + CUSTODY',
      summary:
        'Order, two-person mapping, public leaf, Bitcoin anchor, congestion stamp, both gates, sequential delay, decryption, commitment check. The whole supported path in order.',
      instructions: [
        'Run the demo.',
        'Follow the steps top to bottom. They match SIGE spec section 10.2.',
        'Note the delay step: the identity appears only after the puzzle is solved.',
      ],
      async run(log, onProgress) {
        const world = createWorld(profile, { t: tuned(1500) })
        const { record, attrs } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const out = await performUnseal(world, record, {
          onStep: stepper(log),
          onProgress,
        })
        const match = out.identity?.attrs.fullLegalName === attrs.fullLegalName
        log({
          label: 'recovered identity equals enrolled identity',
          ok: !!match,
        })
        return out.ok && !!match
      },
    },
    {
      id: 'single-gate',
      title: 'One contribution is not enough',
      tier: 'MATH',
      summary:
        'The AEAD key needs both pairing contributions. One gate alone, or a guessed second half, opens nothing.',
      instructions: [
        'Run the demo.',
        'The warrant contribution alone fails to derive the key.',
        'Decryption fails closed. No partial identity leaks.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const { record } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const zA = deriveContribution(
          'warrant',
          record.idWarrant,
          activeEpoch(world).xA,
          record.tracks.standard.U,
        )
        log({
          label: 'warrant contribution derived (log gate withheld)',
          ok: true,
        })
        const context = escrowContext(world, { ...record, track: 'standard' })
        const guessed = combineContributions(
          zA,
          randomBytes(576),
          record.transcriptHash,
          context,
        )
        const opened = open(
          guessed,
          record.tracks.standard.outer.nonce,
          record.tracks.standard.outer.ciphertext,
          context,
        )
        log({
          label: 'decryption with one real and one guessed contribution fails',
          ok: opened === null,
        })
        const doubled = combineContributions(
          zA,
          zA,
          record.transcriptHash,
          context,
        )
        const opened2 = open(
          doubled,
          record.tracks.standard.outer.nonce,
          record.tracks.standard.outer.ciphertext,
          context,
        )
        log({
          label: 'decryption with the same contribution twice fails',
          ok: opened2 === null,
        })
        return opened === null && opened2 === null
      },
    },
    {
      id: 'wrong-account',
      title: 'Escrow opens only its own account',
      tier: 'MATH',
      summary:
        "Contributions are derived from account-scoped identities. Contributions for Ada never open Bo's ciphertext.",
      instructions: [
        'Run the demo.',
        'Two accounts enroll. Gates derive contributions scoped to Ada.',
        "Applying them to Bo's escrow fails. Applying them to Ada's works.",
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const owner = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const other = mustEnroll(world, 'DOC-B-9034', PERSON_B)
        log({ label: 'Ada and Bo enrolled', ok: true })
        const zA = deriveContribution(
          'warrant',
          owner.record.idWarrant,
          activeEpoch(world).xA,
          other.record.tracks.standard.U,
        )
        const zB = deriveContribution(
          'log',
          owner.record.idLog,
          activeEpoch(world).xB,
          other.record.tracks.standard.U,
        )
        const cross = openOuter(world, other.record, { zA, zB })
        log({
          label: "Ada-scoped contributions fail on Bo's ciphertext",
          ok: cross === null,
        })
        const ownA = deriveContribution(
          'warrant',
          owner.record.idWarrant,
          activeEpoch(world).xA,
          owner.record.tracks.standard.U,
        )
        const ownB = deriveContribution(
          'log',
          owner.record.idLog,
          activeEpoch(world).xB,
          owner.record.tracks.standard.U,
        )
        const own = openOuter(world, owner.record, { zA: ownA, zB: ownB })
        log({
          label: "the same identities open Ada's own ciphertext",
          ok: own !== null,
        })
        return cross === null && own !== null
      },
    },
    {
      id: 'k-reconstruction',
      title: 'K rebuilds from the stored record alone',
      tier: 'MATH',
      summary:
        'Draft 0.1 forgot to store the transcript hash, so every escrow would have been permanently undecryptable. The fix is stored and regression-tested here.',
      instructions: [
        'Run the demo.',
        'The ceremony uses only stored record fields. Decryption succeeds.',
        'The Draft 0.1 record (no transcript hash) fails, exactly as the spec warns.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const { record } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const zA = deriveContribution(
          'warrant',
          record.idWarrant,
          activeEpoch(world).xA,
          record.tracks.standard.U,
        )
        const zB = deriveContribution(
          'log',
          record.idLog,
          activeEpoch(world).xB,
          record.tracks.standard.U,
        )
        const opened = openOuter(world, record, { zA, zB })
        log({
          label: 'K reconstructed from stored record fields only',
          ok: opened !== null,
        })
        const context = escrowContext(world, { ...record, track: 'standard' })
        const draft01 = kdf(
          new Uint8Array([...zA, ...zB]),
          new Uint8Array(32),
          context,
        )
        const broken = open(
          draft01,
          record.tracks.standard.outer.nonce,
          record.tracks.standard.outer.ciphertext,
          context,
        )
        log({
          label: 'Draft 0.1 record without transcript_hash cannot decrypt',
          ok: broken === null,
        })
        return opened !== null && broken === null
      },
    },
    {
      id: 'forged-order',
      title: 'Warrant gate refuses a forged order',
      tier: 'CUSTODY',
      summary:
        'An order signed by a key outside the pinned trust list is refused before any contribution exists.',
      instructions: [
        'Run the demo.',
        'The order carries a valid-looking signature from a rogue key.',
        'The warrant gate refuses. No contribution is derived.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const { record } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const out = await performUnseal(world, record, {
          forgedOrder: true,
          onStep: stepper(log),
        })
        const refusedAtWarrant = !out.ok && out.refusal?.gate === 'warrant'
        log({
          label: 'unseal stopped at the warrant gate',
          ok: refusedAtWarrant,
        })
        return refusedAtWarrant
      },
    },
    {
      id: 'log-refusals',
      title: 'Log gate refusals: no leaf, shallow anchor, rollback',
      tier: 'CUSTODY',
      summary:
        'Three faults, three refusals: a leaf never published, an anchor below the confirmation policy, and a rolled-back tree head against monotonic state.',
      instructions: [
        'Run the demo.',
        'Each of the three runs injects one fault.',
        'The log gate refuses each one and releases nothing.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const a = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const noLeaf = await performUnseal(world, a.record, {
          skipLeafAppend: true,
        })
        log({
          label: `un-appended leaf refused: ${noLeaf.refusal?.reason ?? '?'}`,
          ok: !noLeaf.ok && noLeaf.refusal?.gate === 'log',
        })

        const shallow = await performUnseal(world, a.record, {
          confirmations: 1,
        })
        log({
          label: `shallow anchor refused: ${shallow.refusal?.reason ?? '?'}`,
          ok: !shallow.ok && shallow.refusal?.gate === 'log',
        })

        const staleHead = signHeadRecord(world, null)
        const good = await performUnseal(world, a.record, { skipDelay: true })
        log({
          label: 'one valid unseal advanced the monotonic state',
          ok: good.ok,
        })

        // Same account would repeat the auth hash and short-circuit before the rollback check.
        const b = mustEnroll(world, 'DOC-B-9034', PERSON_B)
        const rollback = await performUnseal(world, b.record, {
          presentStaleHead: staleHead,
        })
        const rollbackReason = rollback.refusal?.reason ?? '?'
        log({
          label: `rolled-back head refused: ${rollbackReason}`,
          ok:
            !rollback.ok &&
            rollback.refusal?.gate === 'log' &&
            rollbackReason.includes('rollback'),
        })

        return !noLeaf.ok && !shallow.ok && good.ok && !rollback.ok
      },
    },
    {
      id: 'timed-commitment',
      title: 'The delay binds both master secrets',
      tier: 'MATH',
      summary:
        'An adversary holding both master secrets skips every gate and opens the outer envelope instantly. The identity still costs t sequential squarings. A public proof binds that delay to the published commitment, so anyone checks the claim directly. Enrollment paid nothing: the client used the trapdoor. The client builds the puzzle, so this binds every server-side adversary, not a malicious client that keeps the factorization.',
      instructions: [
        'Run the demo.',
        'Compare puzzle creation time (trapdoor) with solving time (sequential).',
        'The identity appears only after the full delay, even for this adversary.',
      ],
      async run(log, onProgress) {
        const world = createWorld(profile, { t: tuned(DELAY_T) })
        const t0 = performance.now()
        const { record, attrs } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        const enrollMs = Math.round(performance.now() - t0)
        log({
          label: `enrollment built the puzzle with the trapdoor in ${enrollMs} ms`,
          ok: true,
        })

        const { zA, zB } = deriveBothOutOfInterface(world, record, {
          unsafe: true,
        })
        const opened = openOuter(world, record, { zA, zB })
        log({
          label:
            'adversary with both master secrets opened the outer envelope instantly',
          ok: opened !== null,
        })
        if (!opened) return false

        const t1 = performance.now()
        const identity = await payDelayAndDecrypt(world, {
          record,
          opened,
          onProgress,
        })
        const solveMs = Math.round(performance.now() - t1)
        const bound =
          !!identity &&
          verifyCommitmentOpening(record, identity.attrs, identity.opening)
        log({
          label: `delay paid: ${record.t} sequential squarings in ${solveMs} ms`,
          ok: bound,
          detail: `no shortcut exists server-side; recovered "${identity?.attrs.fullLegalName}" = enrolled "${attrs.fullLegalName}"`,
        })
        return opened !== null && bound
      },
    },
    {
      id: 'delay-proof',
      title: 'Anyone verifies the delay without paying it',
      tier: 'MATH',
      summary:
        'The envelope publishes a commitment and a proof that the puzzle opens, within t sequential squarings, to the discrete log of that commitment. Anyone checks the proof without paying the delay. An operator cannot enroll a puzzle that opens to garbage: the proof is checked before enrollment completes.',
      instructions: [
        'Run the demo.',
        'Compare the proof verify time against the puzzle solve time.',
        'Watch four tampered proofs get refused, each for a different reason.',
        'Then watch the honest puzzle get solved.',
      ],
      async run(log, onProgress) {
        const world = createWorld(profile, { t: tuned(DELAY_T) })
        const { record } = mustEnroll(world, 'DOC-VTD-PROOF', PERSON_A)
        const contributions = deriveBothOutOfInterface(world, record, {
          unsafe: true,
        })
        const opened = openOuter(world, record, contributions)
        if (!opened) return false
        const { envelope } = opened
        const expectations = {
          hS: envelope.hS,
          profile: world.policy.vtdProfile,
        }

        const verifyStart = performance.now()
        const verifyReason = verifyVtd(
          world.delayParams,
          envelope.proof,
          expectations,
        )
        const verifyMs = performance.now() - verifyStart
        const solveStart = performance.now()
        const secret = await solveVtd(
          world.delayParams,
          envelope.proof,
          onProgress,
        )
        const solveMs = performance.now() - solveStart
        const verifyOk = verifyReason === null
        log({
          label: `proof verified in ${verifyMs.toFixed(1)} ms; solving the puzzle took ${solveMs.toFixed(1)} ms`,
          ok: verifyOk,
          detail: verifyTimingDetail(verifyMs, solveMs),
        })

        const { n, k, o } = world.policy.vtdProfile
        const bits = soundnessBits(world.policy.vtdProfile)
        const worst = worstCaseSolves(world.policy.vtdProfile)
        const expectedWorst = n - o + 1
        const metricsOk = worst === expectedWorst
        log({
          label: `worst case ${worst} solves matches n-o+1 for n=${n} k=${k} o=${o}; ${bits.toFixed(1)} soundness bits printed, not gated`,
          ok: metricsOk,
        })

        const commitReason = enrollWithTamperedProof(
          world,
          'DOC-VTD-BAD-COMMIT',
        )
        const commitOk = refusedBecause(commitReason, /commit/i)
        log({
          label: `commitment the proof was not built against, refused: ${commitReason ?? '?'}`,
          ok: commitOk,
        })

        const [firstOpened, ...restOpened] = envelope.proof.opened
        const shareTampered = {
          ...envelope.proof,
          opened: [
            { ...firstOpened, share: firstOpened.share + 1n },
            ...restOpened,
          ],
        }
        const shareReason = verifyVtd(
          world.delayParams,
          shareTampered,
          expectations,
        )
        const shareOk = refusedBecause(shareReason, /puzzle/i)
        log({
          label: `opened share altered after the fact, refused: ${shareReason ?? '?'}`,
          ok: shareOk,
        })

        const nonceReason = enrollReusingProofNonce(
          world,
          'DOC-VTD-REUSED-NONCE',
          record,
        )
        const nonceOk = refusedBecause(nonceReason, /nonce/i)
        log({
          label: `swapped proof nonce, refused: ${nonceReason ?? '?'}`,
          ok: nonceOk,
        })

        const weakProfile = { n: 3, k: 2, o: 1 }
        const weakProof = proveVtd(world.delayParams, secret, weakProfile)
        const weakBits = soundnessBits(weakProfile)
        const pinnedReason = verifyVtd(
          world.delayParams,
          weakProof,
          expectations,
        )
        const naiveVerifyResult = verifyVtd(world.delayParams, weakProof, {
          hS: envelope.hS,
          profile: weakProfile,
        })
        const naiveAccepts = naiveVerifyResult === null
        const profileOk =
          refusedBecause(pinnedReason, /profile/i) && naiveAccepts
        log({
          label: `weaker profile n=3 k=2 o=1 (${weakBits.toFixed(2)} soundness bits) refused against the pinned profile: ${pinnedReason ?? '?'}`,
          ok: profileOk,
          detail: weakProfileDetail(naiveAccepts, naiveVerifyResult),
        })

        const matches = bytesEqual(scalarCommitment(secret), envelope.hS)
        log({
          label: "solved secret's commitment matches the published H_s",
          ok: matches,
        })

        return (
          verifyOk &&
          metricsOk &&
          commitOk &&
          shareOk &&
          nonceOk &&
          profileOk &&
          matches
        )
      },
    },
    {
      id: 'congestion',
      title: 'Bulk requests get geometrically slower',
      tier: 'MATH + CUSTODY',
      summary:
        'Six unseals in a burst. Each stamp chains from the previous one, so the work cannot be parallelized, and the required difficulty doubles once the baseline is passed. This binds a requester coming through the gate. It does not bind a holder of both master secrets, who never presents a stamp.',
      instructions: [
        'Run the demo.',
        'Watch the required difficulty per unseal: flat, then doubling to the cap.',
        'Every leaf publishes its difficulty, so a third party recomputes the schedule.',
      ],
      async run(log) {
        const df = tuned(CONGESTION_FLOOR)
        const world = createWorld(profile, {
          t: tuned(400),
          congestion: { dFloor: df, baseline: 1, cap: 4, windowBlocks: 1000 },
        })
        const docs = ['A', 'B', 'C', 'D', 'E', 'F'].map((s) => `DOC-BURST-${s}`)
        // Hand-derived independently of the implementation: df x 2^clamp(n-1, 0, 4).
        const expected = [df, df, df * 2, df * 4, df * 8, df * 16]
        const measured: number[] = []
        const published: number[] = []
        let allOk = true
        for (const [i, doc] of docs.entries()) {
          const enrolled = mustEnroll(world, doc, {
            ...PERSON_A,
            documentNumber: doc,
          })
          const t0 = performance.now()
          const out = await performUnseal(world, enrolled.record, {
            skipDelay: true,
          })
          const ms = Math.round(performance.now() - t0)
          measured.push(out.stampDifficulty ?? -1)
          const leaf = out.published ? parseLeaf(out.published.leafBytes) : null
          published.push(leaf?.congestion_difficulty ?? -1)
          allOk = allOk && out.ok
          log({
            label: `unseal ${i + 1}: difficulty ${out.stampDifficulty}, ${ms} ms`,
            ok: out.ok,
          })
        }
        const geometric = JSON.stringify(measured) === JSON.stringify(expected)
        log({
          label: `schedule matches the hand-written formula [${expected.join(', ')}]`,
          ok: geometric,
        })
        const recomputable =
          JSON.stringify(published) === JSON.stringify(expected)
        log({
          label: 'every public leaf carries the difficulty it was charged',
          ok: recomputable,
        })
        return allOk && geometric && recomputable
      },
    },
    {
      id: 'equivocation',
      title: 'Equivocation yields transferable proof',
      tier: 'MATH',
      summary:
        'The operator signs two incompatible heads for the same tree size. Any observer holding both has cryptographic proof and the system enters lockdown.',
      instructions: [
        'Run the demo.',
        'The operator signs the honest head, then a conflicting one.',
        'Both verify under the log key. Together they are portable evidence.',
      ],
      async run(log) {
        const world = createWorld(profile)
        world.log.append(dhash('leaf-demo', randomBytes(16)))
        const honest = world.log.signHead()
        log({
          label: `honest head signed at size ${honest.treeSize}`,
          ok: true,
        })
        const forged = world.log.signArbitraryHead(
          honest.treeSize,
          dhash('hidden-branch', randomBytes(16)),
        )
        log({
          label: 'operator signed a second, incompatible head at the same size',
          ok: true,
        })
        const proof = detectEquivocation(world.log.publicKey, honest, forged)
        log({
          label:
            'monitor verified both signatures: transferable equivocation proof',
          ok: proof !== null,
        })
        if (proof) {
          world.lockdown = true
          log({
            label: 'both HSM policies enter lockdown, unseals halt',
            ok: true,
          })
        }
        return proof !== null && world.lockdown
      },
    },
    {
      id: 'roles',
      title: 'Accepted roles pass, unlisted roles are refused',
      tier: 'CUSTODY',
      summary:
        'The active profile pins which authority roles the warrant gate accepts. The issuing role is published in the clear, so volume per role is publicly countable.',
      instructions: [
        'Run the demo.',
        'One order per role in the active profile hits the warrant gate.',
        'Check the leaf JSON: the role is public, the account stays hidden.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(400) })
        const results: boolean[] = []
        for (const role of profile.roles) {
          const enrolled = mustEnroll(world, `DOC-ROLE-${role}`, {
            ...PERSON_A,
            documentNumber: role,
          })
          const out = await performUnseal(world, enrolled.record, {
            role,
            skipDelay: true,
          })
          const expected = profile.acceptedRoles.includes(role)
          const pass =
            out.ok === expected && (expected || out.refusal?.gate === 'warrant')
          results.push(pass)
          log({
            label: `${role} order ${out.ok ? 'accepted' : `refused: ${out.refusal?.reason}`}`,
            ok: pass,
          })
        }
        const enrolled = mustEnroll(world, 'DOC-LEAF-VIEW', PERSON_A)
        const viewRole = profile.acceptedRoles[1] ?? profile.acceptedRoles[0]
        const order = issueOrder(world, viewRole, 'leaf-view')
        const built = buildUnsealLeaf(
          world,
          createAuthorization(world, { record: enrolled.record, order })
            .authorization,
        )
        const clear =
          built.leaf.issuing_role === viewRole &&
          !toHex(built.bytes).includes(toHex(enrolled.record.accountId))
        log({
          label:
            'leaf publishes issuing_role, account only as hiding commitment',
          ok: clear,
        })
        const opens = openAccountCommitment(
          built.leaf,
          enrolled.record.accountId,
          built.blinding,
        )
        log({
          label:
            'retained blinding opens the commitment for a later Disclosure leaf',
          ok: opens,
        })
        return results.every(Boolean) && clear && opens
      },
    },
    {
      id: 'bypass',
      title: 'Out-of-interface bypass, shown honestly',
      tier: 'ASSUMED',
      summary:
        'An adversary controlling both HSM domains skips gates, log, and anchor. The spec does not claim to prevent this. It bounds it: the delay still applies, and no anchored leaf exists to justify the release.',
      instructions: [
        'Run the demo.',
        'The bypass requires an explicit unsafe flag. The default path refuses.',
        'The identity is recovered, but the delay was paid and the public log shows nothing: provably out-of-policy if ever disclosed.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(800) })
        const { record } = mustEnroll(world, 'DOC-A-4472', PERSON_A)
        let refusedByDefault = false
        try {
          deriveBothOutOfInterface(world, record)
        } catch {
          refusedByDefault = true
        }
        log({
          label: 'derivation without { unsafe: true } refused',
          ok: refusedByDefault,
        })

        const sizeBefore = world.log.size()
        const { zA, zB } = deriveBothOutOfInterface(world, record, {
          unsafe: true,
        })
        const opened = openOuter(world, record, { zA, zB })
        log({
          label: 'both-domain adversary bypassed gates, log, and anchor',
          ok: opened !== null,
        })
        if (!opened) return false
        const identity = await payDelayAndDecrypt(world, { record, opened })
        const recovered =
          !!identity &&
          verifyCommitmentOpening(record, identity.attrs, identity.opening)
        log({
          label: `identity recovered anyway, after paying the ${record.t}-squaring delay`,
          ok: recovered,
        })
        const silent = world.log.size() === sizeBefore
        log({
          label:
            'no unseal leaf exists: a disclosed contribution is provably out-of-policy',
          ok: silent,
          detail: 'this is the honest gap: CUSTODY bypassed, MATH floor held',
        })
        return refusedByDefault && recovered && silent
      },
    },
    {
      id: 'release-control',
      title: 'Release control: decoy leaf, replay, mismatched target',
      tier: 'CUSTODY',
      summary:
        'Four attacks on the release path itself. A leaf unrelated to the unseal, a second release against one authorization, an authorization labelled with the wrong role, and a record claiming a delay its puzzle does not charge.',
      instructions: [
        'Run the demo.',
        'Each attack presents otherwise valid material with one binding broken.',
        'Every one is refused, and each refusal names the binding that failed.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(400) })
        const primary = mustEnroll(world, 'DOC-DECOY', PERSON_A)

        const decoy = encodeCbor(
          new Map<string, CborValue>([
            ['leaf_type', 'DECOY'],
            ['note', 'unrelated'],
          ]),
        )
        const decoyIndex = world.log.append(decoy)
        const decoySth = signHeadRecord(world, null)
        const decoyOut = await performUnseal(world, primary.record, {
          skipDelay: true,
          reuse: {
            leafBytes: decoy,
            leafIndex: decoyIndex,
            head: decoySth,
            anchor: {
              sthHash: new Uint8Array(0),
              blockHeight: -1,
              blockHash: new Uint8Array(0),
            },
          },
        })
        const decoyRefused = !decoyOut.ok
        log({
          label: `decoy leaf refused: ${decoyOut.refusal?.reason ?? '?'}`,
          ok: decoyRefused,
        })

        const first = await performUnseal(world, primary.record, {
          skipDelay: true,
        })
        log({
          label: 'first release against this authorization succeeded',
          ok: first.ok,
        })
        if (!first.published) {
          log({
            label: 'first release did not publish a leaf to replay',
            ok: false,
          })
          return false
        }
        const replay = await performUnseal(world, primary.record, {
          skipDelay: true,
          reuse: first.published,
        })
        const replayRefused = !replay.ok
        log({
          label: `replay refused: ${replay.refusal?.reason ?? '?'}`,
          ok: replayRefused,
        })

        const secondary = mustEnroll(world, 'DOC-ROLE-SWAP', PERSON_B)
        const orderRole = profile.acceptedRoles[0]
        const swapRole = profile.roles.find((r) => r !== orderRole) ?? orderRole
        const swapOrder = issueOrder(world, orderRole, 'swap')
        const { authorization } = createAuthorization(world, {
          record: secondary.record,
          order: swapOrder,
        })
        const auth = { ...authorization, issuing_role: swapRole }
        const swap = warrantGate(
          world,
          {
            auth,
            order: swapOrder,
            leafBytes: buildUnsealLeaf(world, auth).bytes,
          },
          secondary.record,
        )
        const swapRefused = swap.refused
        log({
          label: `role swap refused: ${swap.refused ? swap.reason : 'ACCEPTED'}`,
          ok: swapRefused,
        })

        const slow = createWorld(profile, { t: tuned(4) })
        const delayLiar = mustEnroll(slow, 'DOC-DELAY-LIE', PERSON_A)
        delayLiar.record.t = 500000
        const contributions = deriveBothOutOfInterface(slow, delayLiar.record, {
          unsafe: true,
        })
        const opened = openOuter(slow, delayLiar.record, contributions)
        const lied = opened
          ? await payDelayAndDecrypt(slow, { record: delayLiar.record, opened })
          : null
        log({
          label: 'record claiming an unpaid delay cannot decrypt',
          ok: lied === null,
        })

        return (
          decoyRefused &&
          first.ok &&
          replayRefused &&
          swapRefused &&
          lied === null
        )
      },
    },
    {
      id: 'epoch-rotation',
      title: 'Epoch rotation keeps old escrows openable',
      tier: 'CUSTODY',
      summary:
        'Boneh-Franklin IBE cannot re-encrypt existing ciphertexts to new master keys. Rotation must therefore keep the old epoch available, and gates must select keys by the record epoch, never the active one.',
      instructions: [
        'Run the demo.',
        'An account enrolls under epoch 1, then the world rotates to epoch 2.',
        'The old escrow still opens under epoch 1, and a new account uses epoch 2.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(400) })
        const old = mustEnroll(world, 'DOC-EPOCH-1', PERSON_A)
        log({
          label: `enrolled under epoch ${old.record.escrowEpoch}`,
          ok: old.record.escrowEpoch === 1,
        })

        const next = rotateEpoch(world)
        log({
          label: `rotated: active epoch is now ${next.epoch}`,
          ok: next.epoch === 2,
        })

        const out = await performUnseal(world, old.record, {})
        const recovered =
          out.identity?.attrs.fullLegalName === PERSON_A.fullLegalName
        log({
          label: 'epoch-1 escrow still unseals after rotation',
          ok: out.ok && recovered,
        })

        const fresh = mustEnroll(world, 'DOC-EPOCH-2', PERSON_B)
        log({
          label: `new enrollment uses epoch ${fresh.record.escrowEpoch}`,
          ok: fresh.record.escrowEpoch === 2,
        })

        const stale = activeEpoch(world).epoch !== old.record.escrowEpoch
        log({
          label: 'old and new epochs coexist in the key store',
          ok: stale && world.epochs.size === 2,
        })
        return (
          out.ok &&
          recovered &&
          fresh.record.escrowEpoch === 2 &&
          world.epochs.size === 2
        )
      },
    },
    {
      id: 'reconciliation',
      title: 'Every unseal must reconcile to a published record',
      tier: 'CUSTODY + ASSUMED',
      summary:
        'The external authority must publish its records once a process closes. A keyless verifier joins every unseal leaf against that docket. An unmatched leaf past the horizon is flagged as presumptively out-of-policy. Flagged, never auto-revealed.',
      instructions: [
        'Run the demo.',
        'Three unseals anchor. The authority publishes records for two.',
        'Watch the third go pending, then overdue once the horizon passes.',
      ],
      async run(log) {
        const world = createWorld(profile, { t: tuned(400) })
        const docket: DocketRecord[] = []
        const sightings: UnsealSighting[] = []
        for (const doc of ['DOC-REC-1', 'DOC-REC-2', 'DOC-REC-3']) {
          const sighting = await anchorSighting(world, doc)
          if (!sighting) return false
          sightings.push(sighting)
        }
        log({
          label: 'three unseals anchored through the supported path',
          ok: true,
        })
        for (const s of sightings.slice(0, 2)) {
          docket.push({
            authorizationHash: s.authorizationHash,
            publishedAtHeight: world.chain.tipHeight(),
            caseSummary: 'closed process record',
          })
        }
        log({
          label: 'authority published records for the first two',
          ok: true,
        })

        const horizon = {
          tipHeight: world.chain.tipHeight(),
          horizonBlocks: profile.recordHorizonBlocks,
        }
        const before = reconcile(sightings, docket, horizon)
        const pendingOk =
          before.map((e) => e.status).join() === 'matched,matched,pending'
        log({
          label:
            'keyless reconcile: matched, matched, pending (horizon not reached)',
          ok: pendingOk,
        })

        for (let i = 0; i <= profile.recordHorizonBlocks; i++)
          world.chain.mine(null)
        const after = reconcile(sightings, docket, {
          tipHeight: world.chain.tipHeight(),
          horizonBlocks: profile.recordHorizonBlocks,
        })
        const overdueOk =
          after.map((e) => e.status).join() === 'matched,matched,overdue'
        log({
          label:
            'past the horizon: the unmatched leaf is presumptively out-of-policy',
          ok: overdueOk,
          detail:
            'ASSUMED: the promise itself. CUSTODY: the flag. Never auto-reveal.',
        })
        return pendingOk && overdueOk
      },
    },
  ]
}
