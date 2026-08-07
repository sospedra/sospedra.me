import assert from 'node:assert/strict'
import { test } from 'node:test'
import { open, seal } from '../src/core/aead.ts'
import { randomBytes, utf8 } from '../src/core/bytes.ts'
import {
  combineContributions,
  deriveContribution,
  encapsulate,
  gateIdentity,
  genEpoch,
  verifyEncapsulation,
} from '../src/core/kem.ts'

const net = utf8('test-net')
const account = randomBytes(32)
const enrollment = randomBytes(16)
const transcript = randomBytes(32)
const context = randomBytes(32)
const plaintext = utf8('the escrowed envelope bytes for this record')

function setup(pt: Uint8Array = plaintext) {
  const epoch = genEpoch(1)
  const idA = gateIdentity('warrant', net, account, enrollment, 1)
  const idB = gateIdentity('log', net, account, enrollment, 1)
  const enc = encapsulate({
    ids: { warrant: idA, log: idB },
    keys: { pkA: epoch.pkA, pkB: epoch.pkB },
    transcriptHash: transcript,
    context,
    plaintext: pt,
  })
  return { epoch, idA, idB, enc }
}

test('two contributions rebuild K, one does not', () => {
  const { epoch, idA, idB, enc } = setup()
  const zA = deriveContribution('warrant', idA, epoch.xA, enc.U)
  const zB = deriveContribution('log', idB, epoch.xB, enc.U)
  assert.deepEqual(combineContributions(zA, zB, transcript, context), enc.K)
  const guessed = combineContributions(
    zA,
    randomBytes(zB.length),
    transcript,
    context,
  )
  assert.notDeepEqual(guessed, enc.K)
  const doubled = combineContributions(zA, zA, transcript, context)
  assert.notDeepEqual(doubled, enc.K)
})

test('wrong identity or wrong transcript never rebuilds K', () => {
  const { epoch, idA, enc } = setup()
  const otherId = gateIdentity('log', net, randomBytes(32), enrollment, 1)
  const zA = deriveContribution('warrant', idA, epoch.xA, enc.U)
  const zWrong = deriveContribution('log', otherId, epoch.xB, enc.U)
  assert.notDeepEqual(
    combineContributions(zA, zWrong, transcript, context),
    enc.K,
  )
  const zB = deriveContribution(
    'log',
    gateIdentity('log', net, account, enrollment, 1),
    epoch.xB,
    enc.U,
  )
  assert.notDeepEqual(
    combineContributions(zA, zB, randomBytes(32), context),
    enc.K,
  )
})

test('garbage U is rejected', () => {
  const { epoch, idA } = setup()
  assert.throws(() =>
    deriveContribution('warrant', idA, epoch.xA, randomBytes(96)),
  )
})

test('the honest path passes the re-encapsulation check', () => {
  const { epoch, idA, idB, enc } = setup()
  const zA = deriveContribution('warrant', idA, epoch.xA, enc.U)
  const zB = deriveContribution('log', idB, epoch.xB, enc.U)
  const K = combineContributions(zA, zB, transcript, context)
  const sealed = seal(K, plaintext, context)
  const opened = open(K, sealed.nonce, sealed.ciphertext, context)
  assert.deepEqual(opened, plaintext)
  assert.equal(
    verifyEncapsulation({
      transcriptHash: transcript,
      context,
      plaintext,
      U: enc.U,
    }),
    true,
  )
})

test('a U honest for other content is refused against this ciphertext, though the AEAD tag is valid', () => {
  const { epoch, idA, idB, enc } = setup()
  const zA = deriveContribution('warrant', idA, epoch.xA, enc.U)
  const zB = deriveContribution('log', idB, epoch.xB, enc.U)
  const K = combineContributions(zA, zB, transcript, context)
  const sealed = seal(K, plaintext, context)
  const opened = open(K, sealed.nonce, sealed.ciphertext, context)
  assert.deepEqual(
    opened,
    plaintext,
    'AEAD tag is self-consistent and opens fine',
  )

  const other = setup(utf8('unrelated content, honestly encapsulated'))
  assert.equal(
    verifyEncapsulation({
      transcriptHash: transcript,
      context,
      plaintext: opened ?? new Uint8Array(0),
      U: other.enc.U,
    }),
    false,
    'other.enc.U was derived from different content, not what this ciphertext decrypted to',
  )
})

test('a U replayed from another record is refused even for identical plaintext', () => {
  const { enc } = setup()
  const otherTranscript = randomBytes(32)
  const otherContext = randomBytes(32)
  assert.equal(
    verifyEncapsulation({
      transcriptHash: otherTranscript,
      context: otherContext,
      plaintext,
      U: enc.U,
    }),
    false,
  )
})
