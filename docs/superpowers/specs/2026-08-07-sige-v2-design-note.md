# SIGE v2 design note

Written 2026-08-07 from a working session. This is a DESIGN NOTE, not a spec.
It records a direction, the reasoning behind it, and the places where the
reasoning was wrong. Nothing here is built.

`apps/sige` implements v1. This note describes what v2 would change and what
carries over. Read `2026-08-06-sige-defect-ledger.md` first.

## The three claims, restated by the owner

1. The identity in an account is sealed.
2. It can only be unsealed if the unsealing is published in a public record.
3. The record carries a reference a human can check by hand.

Everything below serves those three and nothing else. Earlier framings of SIGE
promised four properties. Two of them (unskippable wall-clock delay, escalating
cost) are not part of this scope.

## Why v1 cannot deliver claim 2

Verified by running it on 2026-08-07:

```
envelope opened            : true
log leaves before / after  : 1 / 1
auditor-visible difference : NONE
```

`deriveBothOutOfInterface` recovers the identity with no gate, no leaf, no
anchor. Both master scalars live in one process (`src/core/kem.ts:30`). The
two-gate split models separate custody without providing it.

Worse, and this is the finding that reorders everything: `enroll()` takes
plaintext identity attributes as a plain argument (`src/world/world.ts:980`).
The operator process reads the identity before encrypting it. So the whole
escrow protects a ciphertext the company does not need. `README.md:114` already
names the missing zero-knowledge enrollment circuit as a stop-launch condition.

## The direction

Hold less. The company should hold neither the plaintext nor any part of the
master key. Then claim 2 stops depending on the company's behaviour.

### Enrollment, on the user's device

- E1. Native app reads the passport chip over NFC. Requires Active
  Authentication or Chip Authentication, so a static chip dump does not pass.
  The chip challenge derives from the account id AND a server nonce, and the
  server nonce must be a public input to the circuit, expiring and single-use.
- E2. Selfie matched against the chip photo, locally.
- E3. A circuit takes passport data as PRIVATE input. The same wires feed the
  country signature check, the AA check, the nullifier, and a commitment. The
  commitment and nullifier are circuit OUTPUTS. The account id is a public
  input. The nullifier MUST NOT be scoped to the account id.
- E4. A random 255-bit key is generated. The identity is AEAD-sealed under it.
  The RANDOM KEY, never the identity, is Shamir-shared and the shares are
  IBE-encrypted. A Fiat-Shamir cut-and-choose proves the ciphertexts correctly
  share a secret matching the published commitment.
- E5. The device sends only ciphertexts and proofs. Sealing runs with no
  network. One endpoint, one documented message, no certificate pinning so
  traffic is inspectable, no analytics or third-party SDK on this path.

### Key custody

- K1. The IBE master secret sits with an existing public threshold network. The
  company holds no part of it. A concrete network must be named before this
  design is buildable. "A network of the Shutter or Lit type" is not a design.
- K2. Keys are derived per account and do not exist until derived. A key for
  account A is useless for account B.

### Unsealing

- U1. The company posts a request to a contract. Public immediately. Reveals a
  count, hides the target. Carries `H(justification)` so the stated reason is
  fixed on day zero and cannot be revised later.
- U2. The network derives the per-account key and encrypts it to the requester
  key committed in that transaction.
- U3. The NETWORK, not the company, builds a timelocked disclosure naming the
  account, sealed to a public beacon roughly ninety days out.
- U4. Log, Bitcoin anchoring, unseal leaf and hand-checkable reference carry
  over from v1.
- U5. Unsealing starts an investigation with no user notification. At court
  resolution the account is suspended or removed and the user learns then.

### Client integrity

- C1. iOS and Android only. Passport chips need ISO7816 APDUs, which Web NFC
  cannot issue, so this is forced rather than chosen.
- C2. App Attest and Play Integrity gate enrollment, so a modified app cannot
  enroll. This defends against third-party tampering. It does NOT defend the
  user against the company, and must not be presented as if it does.
- C3. Android builds reproducible. iOS builds are not, because Apple re-signs
  App Store binaries. State the asymmetry publicly.
- C4. The user's checks: watch the app's network traffic, enroll in airplane
  mode, and on Android rebuild from source.

## Errors found in this design, before anyone builds it

An adversarial review on 2026-08-07 found these. Each was verified against the
v1 code.

**1. Sharing the identity directly would leak every identity.** The original
sketch published a commitment to the identity. Identity data is low entropy: a
DNI is eight digits and a letter, and names and birth dates are already in
breach dumps. Anyone could grind candidates against the public commitment.
v1 already does the right thing at `src/world/world.ts:805`, sampling a random
scalar and using it as an AEAD key. E4 above reflects the correction. Do not
undo it.

**2. "Circuit output, not input" is necessary and not sufficient.** It stops the
prover steering the commitment inside the credential proof. It does nothing to
bind that commitment to the one the cut-and-choose uses. The verifier must check
equality explicitly, in one canonical encoding, one curve, one subgroup. v1
checks the equivalent at `src/core/vtd.ts:288`.

**3. Feldman checks alone do not bind the ciphertext.** Every opened share needs
BOTH a Feldman check AND a byte-exact recomputation of its ciphertext from the
revealed coins. Without the second, valid shares can sit beside arbitrary bytes.
v1 recomputes the published lock at `src/core/vtd.ts:312`.

**4. Cut-and-choose never proves every ciphertext is good.** The honest claim is
"except with soundness error, at least k unopened ciphertexts decrypt to
Feldman-consistent shares". Recovery must therefore decrypt candidates, reject
failures, Feldman-check each, collect any k, reconstruct, and compare against
the commitment. Taking the first k is unsafe.

**5. Grinding is not in the soundness budget.** A prover can retry Fiat-Shamir
locally until it draws a favourable challenge. The 41.51 bits of the shipped
profile is pre-query soundness. For this profile the per-attempt cost makes it
impractical, but the stated number must say which it is.

**6. Nobody validates the order.** v1's warrant gate checks the order signature,
the role, and the reviewer quorum (`src/world/world.ts:1449`). In v2 neither the
contract nor the threshold network can do this. Owner decision: that check is
deliberately dropped. A fabricated reference is a credibility failure, not a
cryptographic one. Keep the authority signature so provenance is still checkable
after the reveal.

**7. The selfie bit is unbound.** A circuit proving "the bit was 1" proves
nothing about how the bit was produced. It is a client-trusted input. Label it.

**8. Do not call it VTD.** Swapping the time-lock puzzle for an IBE ciphertext
removes public eventual recovery, sequentiality, the homomorphic fold, and
`solveVtd`. Only the sampling skeleton transfers. Nothing is timed any more.
Call it verifiable threshold IBE escrow.

**9. Fresh Shamir polynomial per enrollment attempt.** Otherwise opened subsets
accumulate across retries and cross the threshold. The random-key pattern in
E4 already defuses this, since accumulated shares would be of unrelated keys,
but state the requirement anyway.

## What v2 would lose

Recorded so the trade is deliberate:

- Write-before-payoff ordering, where a gate withholds until inclusion is
  proven. Landed in v1 on 2026-08-07.
- Exact-ciphertext-scoped contributions. v1 gates return a contribution bound to
  one ciphertext, not a reusable per-account key.
- The computational barrier that still applies even to someone holding both
  master secrets.

Against those, v2 removes unilateral company custody, which is the only one of
the three that blocks claim 2.

## Spanish law: the reference field

Checked 2026-08-07 against secondary sources, not the BOE consolidated text, and
not by a lawyer.

Two paths reach a platform, and only one involves a judge.

- **Art. 588 ter m LECrim.** Prosecutor or judicial police may address service
  providers DIRECTLY for subscriber identification. No judicial authorization.
  Providers must comply or face a disobedience offence. The article names
  information society services, so it reaches a platform.
- **Art. 588 ter k LECrim.** Linking an IP to a user DOES require the
  investigating judge.

The reference is a free-form human-readable string, by owner decision, with a
prefix naming the source:

```
{ request: 'judicial nig #3123421241244412' }
{ request: 'fiscal diligencia #379423987' }
```

The judicial path carries a NIG, assigned at filing under CGPJ Instruction
1/2009, unique nationally, stable across instances. The direct path has only an
internal police or prosecutor reference.

Publish the counts separately. Averaging a judge's order together with a police
form into one number tells a reader something untrue.

**Open legal question, for counsel and not for engineering.** 588 ter m obliges
compliance under threat of a disobedience offence, while this architecture makes
compliance publicly visible by construction. Those can collide. The answer
decides whether the immediate on-chain commitment is viable or whether
everything must sit behind the timelock.

## Status of each piece

| Piece | Status |
|---|---|
| Transparency log, Merkle proofs, anchoring | BUILT in v1 |
| Unseal leaf and hand-checkable reference | BUILT in v1 |
| Cut-and-choose over shared secrets | BUILT in v1 as VTD, needs the IBE swap |
| Random-key-then-AEAD pattern | BUILT in v1, must be preserved |
| Threshold IBE custody | ASSEMBLY, network not yet named |
| Request contract and timelocked disclosure | ASSEMBLY |
| Native app, chip reading, attestation | ASSEMBLY |
| Passport credential circuit | UNWRITTEN, and it is the critical path |
| Binding between credential proof and escrow proof | UNWRITTEN |

## The honest claim, once built

For a pinned key epoch, the release path produces a per-account key only after a
chain-confirmed public request, and anyone can count those requests and read the
disclosures that follow. The company holds no plaintext and no master key.

It does not prove the threshold network never colluded, that the credential
circuit is free of bugs, or that the app a given user ran is the one that was
published.

Three named risks. None of them is "trust us".
