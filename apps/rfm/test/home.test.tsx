import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { Home } from '../src/home/home.tsx'

test('home renders the search headline', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

  assert.match(html, /Browse repos that need support/)
  assert.match(html, /Join the newsletter/)
})
