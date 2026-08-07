# sige

Sealed identity with signature-gated escrow. Companion code for a paper
introducing the construction.

**This is not ready for production. Do not enroll a real identity.**

Every account binds to one legal identity. The binding stays sealed against
the operator and against a database dump. The seal opens along one path
only. That path is public, logged, and arithmetically delayed.

The system is independent of any legal system. Only one actor can trigger an
unseal: an external authority whose records must become public once a
process closes. The `reconciliation` scenario runs that promise.

`generic` is the default authority profile. `es` models Spain as one worked
example, not the frame.

## The claim

Reproduced verbatim from §1 of the SIGE technical specification, because
paraphrasing it is how it becomes an overclaim:

> Every identity recovery performed through the supported production path
> requires a validated legal-order record, a publicly committed and
> Bitcoin-anchored log event, two separately administered hardware
> operations, an unavoidable per-account sequential delay, and a durable
> evidence bundle. Recovery outside that path remains possible for an
> adversary who controls both hardware domains, but it still pays the
> sequential delay, and any released contribution is independently
> verifiable evidence if it is ever disclosed.

The spec adds, and this repo repeats: the system MUST NOT be marketed as
making silent unsealing mathematically impossible.

`CLAIMS.md` carries one row per claim, its tier, its implementation, and the
test that fails if it stops being true.

## Run

    pnpm --dir apps/sige test        # full suite, fast delay params
    pnpm --dir apps/sige typecheck   # tsc
    pnpm --dir apps/sige lint        # biome
    pnpm --dir apps/sige reproduce   # every number the paper cites
    pnpm --dir apps/sige dev         # browser demo at localhost:5173

The `test` script hardcodes `SIGE_FAST=1` ahead of `node --test`. It always
runs fast mode, and your shell's `SIGE_FAST` has no effect. Fast mode
shrinks the delay and the congestion floor so the suite finishes in seconds,
and it drops the LHTLP modulus from about 2048 bits to about 640. It tests
the mechanics, not the hardness.

Real parameters are the honest default. The browser demo pays them, and so
does `reproduce`.

## What is new here

The spec's §5.5A composition had no implementation. This repo builds it:

- an LHTLP time-lock puzzle whose parameters are published per delay
  profile, so the client never holds a trapdoor at all. That is strictly
  stronger than the spec's own construction, where §5.5A concedes the
  client transiently knows the factorization.
- Shamir sharing with Feldman commitments over the inner group, verified in
  one batched group equation.
- a Fiat-Shamir cut-and-choose verifiable timed discrete-log proof, so a
  verifier checks the delay without paying it.

Two results worth stating plainly. Binding the polynomial coefficients to
the secret traded perfect hiding for computational hiding, which is why the
per-proof nonce is load-bearing. And the Fujisaki-Okamoto transform closes a
demonstrated IND-CCA break: `@noble/curves@2.2.0` reduces G2 coordinates
mod p instead of rejecting a non-canonical encoding, so adding p to a limb
gives a different byte string that decodes to the same point.

## What runs for real

BLS12-381 two-gate IBE KEM with an FO transform. LHTLP time-lock puzzle with
a verifiable timed discrete-log proof. Shamir plus Feldman over the inner
group. Deterministic CBOR and framed object hashing per §6.1. Merkle
transparency log with RFC 9162 inclusion and consistency proofs. Chained
congestion work. ed25519 orders and attestations. Two escrow tracks,
standard and emergency, both proven well-formed at enrollment.

The browser demo runs all of it in a Web Worker so the page stays
responsive while the delay is paid. The suite and `reproduce` run the same
code on the node main thread.

## What is simulated

HSM gates are in-process objects, not hardware. The Bitcoin anchor is
`SimBitcoin`, a simulator: it binds a head, it does not prove Bitcoin
inclusion. The authority docket is a fixture. The credential chain in the
enrollment witness is invented, because no PKI exists anywhere in this
codebase.

## What is assumed

Four things are taken on trust from outside this code, and each one is
printed where a reader meets the claim:

- **The canonical chain.** Proof of work is not proof of publication.
  Nothing here can tell a reorg from a lie, so every accepted anchor prints
  `ASSUMED`.
- **Real elapsed time.** The solution proof shows the fold is correct and
  the recovered scalar is the unique discrete log of the pre-delay
  commitment. This LHTLP carries no verifiable-delay certificate.
- **An honest client build.** A malicious client can leak its own secret
  through any prover-chosen unchecked field. A subliminal channel in prover
  randomness is unpreventable.
- **Operator custody.** Split custody is an operational property. It holds
  while the two domains stay separately administered.

## What remains research

- **The zero-knowledge enrollment circuit.** None exists. The enrollment
  verifier runs in clear mode against a witness. §7.6 carries the
  stop-launch condition: if the relation cannot meet the hard maximum
  without sending plaintext identity or credential secrets to a server, the
  production launch MUST stop. §22 Open Decision 1 is the proof-system
  question, still open.
- **Real hardware.** Two separately administered non-exportable domains,
  with the key-ceremony and attestation story that implies.
- **A real chain.** Bitcoin inclusion proofs and reorg handling against a
  live network.
- **Legal review.** The delay is a legal quantity bounded by statutory
  deadlines. Nobody has reviewed whether the profiles here match any real
  deadline.

`CLAIMS.md` also lists the known gaps that are neither simulated nor
assumed, but simply not done yet.
