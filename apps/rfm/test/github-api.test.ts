import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetcherFindSupportIssues,
  fetcherRequestList,
  fetcherSubmitRequest,
} from '../src/services/github-api.ts'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const issue = (body: string) => ({
  body,
  comments: 2,
  created_at: '2020-01-01T00:00:00Z',
  html_url: 'https://github.com/sospedra/rfm/issues/1',
  id: 1,
  number: 1,
  title: 'facebook/react',
  updated_at: '2020-01-02T00:00:00Z',
  user: { login: 'sospedra' },
})

test('fetcherRequestList parses JSON bodies and drops broken ones', async (t) => {
  const payload = {
    items: [issue('{"owner":"facebook","name":"react"}'), issue('not json')],
    total_count: 2,
  }
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(payload))

  const result = await fetcherRequestList('react')

  assert.equal(result.total, 2)
  assert.equal(result.requestList.length, 1)
  assert.equal(result.requestList[0]?.body.owner, 'facebook')
})

test('fetcherRequestList throws the GitHub message on a non-ok response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse({ message: 'Validation Failed' }, 422),
  )

  await assert.rejects(fetcherRequestList(''), {
    message: 'Validation Failed',
  })
})

test('fetcherRequestList falls back to the status when the error body is not JSON', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('bad gateway', { status: 502 }),
  )

  await assert.rejects(fetcherRequestList(''), {
    message: 'GitHub responded 502',
  })
})

test('fetcherFindSupportIssues throws the GitHub message on a non-ok response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse({ message: 'API rate limit exceeded' }, 403),
  )

  await assert.rejects(fetcherFindSupportIssues('facebook/react'), {
    message: 'API rate limit exceeded',
  })
})

test('fetcherSubmitRequest throws the GitHub message on a non-ok response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse({ message: 'Not Found' }, 404),
  )

  await assert.rejects(
    fetcherSubmitRequest('https://github.com/facebook/react'),
    { message: 'Not Found' },
  )
})
