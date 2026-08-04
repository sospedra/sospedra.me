import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requestRandomExtract } from '../src/spg/request.ts'

const wikipediaResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

test('returns the extract of the first page', async () => {
  const fetcher = () =>
    Promise.resolve(
      wikipediaResponse({
        query: { pages: { '42': { extract: 'Some article text.' } } },
      }),
    )

  assert.equal(await requestRandomExtract(fetcher), 'Some article text.')
})

test('requests a plain-text random article extract', async () => {
  const requests: string[] = []
  const fetcher = (url: string) => {
    requests.push(url)
    return Promise.resolve(
      wikipediaResponse({ query: { pages: { '1': { extract: 'x' } } } }),
    )
  }

  await requestRandomExtract(fetcher)

  const url = new URL(requests[0])
  assert.equal(url.origin, 'https://en.wikipedia.org')
  assert.equal(url.searchParams.get('action'), 'query')
  assert.equal(url.searchParams.get('generator'), 'random')
  assert.equal(url.searchParams.get('explaintext'), '1')
  assert.equal(url.searchParams.get('exchars'), '500')
})

test('throws on http errors', async () => {
  const fetcher = () => Promise.resolve(wikipediaResponse({}, 500))

  await assert.rejects(
    requestRandomExtract(fetcher),
    /Wikipedia request failed: 500/,
  )
})

test('throws when the response has no extract', async () => {
  const fetcher = () =>
    Promise.resolve(wikipediaResponse({ query: { pages: {} } }))

  await assert.rejects(requestRandomExtract(fetcher), /no extract/)
})
