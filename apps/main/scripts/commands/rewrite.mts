import * as clack from '@clack/prompts'
import * as cheerio from 'cheerio'
import { isNotNil } from 'es-toolkit'
import Sqids from 'sqids'
import { absolute, readJson, writeJson } from '../io.mts'
import { type Context, unwrap } from '../prompts.mts'

const tiny = new Sqids({ alphabet: 'abcdefghijklmnopqrstuvwxyz', minLength: 4 })
const FETCH_TITLE_TIMEOUT_MS = 10_000

type Rewrite = {
  destination: string
  source: string
  title?: string
  listed?: boolean
}

const withProtocol = (input: string) =>
  URL.canParse(input) ? input : `https://${input}`

const promptDestination = async () =>
  unwrap(
    await clack.text({
      message: 'Destination URL',
      placeholder: 'example.com/some-page',
      validate: (value) => {
        if (!value) return 'A destination is required'
        if (!URL.canParse(withProtocol(value))) return 'Not a valid URL'
      },
    }),
  )

const resolveListed = async ({ arg, hidden }: Context) => {
  if (hidden) return false
  if (arg !== undefined) return true
  return unwrap(
    await clack.confirm({ message: 'List it publicly on /rewrite?' }),
  )
}

const fetchTitle = async (destination: string) => {
  const response = await fetch(destination, {
    signal: AbortSignal.timeout(FETCH_TITLE_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw Error(`${destination} answered ${response.status}`)
  }
  const $ = cheerio.load(await response.text())
  // .first() skips the <title> elements inside inline SVGs
  const title = $('title').first().text().trim()
  return { title: title || 'Undisclosure meta', url: response.url }
}

// legacy hand-written sources do not round-trip; only canonical sqids codes count
const codeSequence = (source: string) => {
  const code = source.replace('/r/', '')
  const [sequence] = tiny.decode(code)
  if (sequence === undefined || tiny.encode([sequence]) !== code) return null
  return sequence
}

const nextSource = (rewrites: Rewrite[]) => {
  const sequences = rewrites
    .map((entry) => codeSequence(entry.source))
    .filter(isNotNil)
  return `/r/${tiny.encode([Math.max(-1, ...sequences) + 1])}`
}

export default async function rewrite(context: Context) {
  const input = context.arg ?? (await promptDestination())
  const destination = new URL(withProtocol(input)).href

  const filename = absolute('services/rewrites.json')
  const rewrites = await readJson<Rewrite[]>(filename, [])
  const taken = (url: string) =>
    rewrites.some((rewrite) => rewrite.destination === url)
  if (taken(destination)) {
    throw Error('This destination is already on rewrites')
  }

  const source = nextSource(rewrites)
  // sources persist forever: a sqids code must not shadow an old hashids one
  if (rewrites.some((rewrite) => rewrite.source === source)) {
    throw Error(`The code ${source} is already taken`)
  }

  const listed = await resolveListed(context)

  const spin = clack.spinner()
  spin.start(`Fetching ${destination}`)
  const page = await fetchTitle(destination)
  spin.stop(`Resolved: ${page.title}`)

  // redirects can land on a destination that is already registered
  if (taken(page.url)) {
    throw Error(`This destination is already on rewrites, as ${page.url}`)
  }

  await writeJson(filename, [
    ...rewrites,
    { destination: page.url, title: page.title, source, listed },
  ])

  return `${page.title} → ${source}`
}
