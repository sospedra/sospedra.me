import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient, track } from '../src/services/analytics.ts'

type Mixpanel = typeof import('mixpanel-browser')['default']

test('createClient resolves null when the import is blocked', async () => {
  const client = await createClient(() =>
    Promise.reject(
      new TypeError('Failed to fetch dynamically imported module'),
    ),
  )

  assert.equal(client, null)
})

test('createClient inits mixpanel and returns it', async () => {
  const initCalls: string[] = []
  const mixpanel = {
    init: (token: string) => initCalls.push(token),
  } as unknown as Mixpanel

  const client = await createClient(async () => ({ default: mixpanel }))

  assert.equal(client, mixpanel)
  assert.equal(initCalls.length, 1)
})

test('track is a no-op without a window', () => {
  assert.equal(track('pview'), undefined)
})
