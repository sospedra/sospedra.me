import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  chainFromEnv,
  GnosisChain,
  MockChain,
  type UnsealRequest,
} from '../src/chain/chain.ts'

function request(tag: string): UnsealRequest {
  return {
    commitment: `0xcommit-${tag}`,
    reasonHash: `0xreason-${tag}`,
    requesterPubKey: '0xrequester',
  }
}

test('the default backing is mock, so nobody spends by forgetting to choose', () => {
  assert.equal(chainFromEnv({}).kind, 'mock')
  assert.equal(chainFromEnv({ CLAVE_CHAIN: 'anything-else' }).kind, 'mock')
})

test('asking for gnosis without an endpoint is refused by name', () => {
  assert.throws(
    () => chainFromEnv({ CLAVE_CHAIN: 'gnosis' }),
    /CLAVE_CHAIN=gnosis needs CLAVE_GNOSIS_RPC/,
  )
})

test('asking for gnosis with an endpoint gives the real backing', () => {
  const chain = chainFromEnv({
    CLAVE_CHAIN: 'gnosis',
    CLAVE_GNOSIS_RPC: 'https://rpc.gnosischain.com',
  })
  assert.equal(chain.kind, 'gnosis')
})

test('the real backing refuses to write rather than failing obscurely', async () => {
  const chain = new GnosisChain({
    rpcUrl: 'https://rpc.gnosischain.com',
    contractAddress: '',
  })
  await assert.rejects(() => chain.anchor('0xroot'), /Set CLAVE_CHAIN=mock/)
  await assert.rejects(
    () => chain.postRequest(request('x')),
    /Set CLAVE_CHAIN=mock/,
  )
})

test('a request is invisible until it reaches the confirmation depth', async () => {
  const chain = new MockChain()
  const tx = await chain.postRequest(request('a'))

  assert.equal((await chain.observeRequests(6)).length, 0)
  chain.advance(5)
  // Five confirmations is still one short of the policy depth.
  assert.equal(await chain.confirmations(tx), 5)
  assert.equal((await chain.observeRequests(6)).length, 0)
  chain.advance(1)
  assert.equal(await chain.confirmations(tx), 6)
  assert.equal((await chain.observeRequests(6)).length, 1)
})

test('requests are observed in order with their commitments intact', async () => {
  const chain = new MockChain()
  await chain.postRequest(request('first'))
  await chain.postRequest(request('second'))
  chain.advance(10)

  const seen = await chain.observeRequests(1)
  assert.equal(seen.length, 2)
  assert.equal(seen.at(0)?.commitment, '0xcommit-first')
  assert.equal(seen.at(1)?.commitment, '0xcommit-second')
  // The target is hidden and the reason is bound. Paper Section 3.8 step 1.
  assert.equal(seen.at(0)?.reasonHash, '0xreason-first')
})

test('anchoring is batched: one write regardless of how much it covers', async () => {
  const chain = new MockChain()
  await chain.anchor('0xroot-covering-one-record')
  await chain.anchor('0xroot-covering-a-million')
  assert.deepEqual(chain.anchoredRoots(), [
    '0xroot-covering-one-record',
    '0xroot-covering-a-million',
  ])
  // Two anchors, two transactions, whatever the record contained. This is why
  // paper Section 9 finds chain cost independent of registration volume.
  assert.equal(await chain.tipHeight(), 2)
})

test('block production is configurable, so depth can be reached realistically', async () => {
  const chain = new MockChain({ blocksPerTx: 12 })
  const tx = await chain.postRequest(request('paced'))
  await chain.postRequest(request('next'))
  assert.equal(await chain.confirmations(tx), 12)
})

// Opt-in. Runs only when CLAVE_LIVE_RPC is set, so the suite stays offline and
// free by default. Reading costs nothing, which is why this is read-only.
test('live gnosis reports a plausible tip height', {
  skip: !process.env.CLAVE_LIVE_RPC,
}, async () => {
  const chain = new GnosisChain({
    rpcUrl: process.env.CLAVE_LIVE_RPC ?? '',
    contractAddress: '',
  })
  const height = await chain.tipHeight()
  assert.ok(
    Number.isSafeInteger(height) && height > 30_000_000,
    `got ${height}`,
  )
})
