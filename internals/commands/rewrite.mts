import * as p from '@clack/prompts'
import * as cheerio from 'cheerio'
import Sqids from 'sqids'
import { abs, readJson, writeJson } from '../io.mts'
import { type Context, unwrap } from '../prompts.mts'

const tiny = new Sqids({ alphabet: 'abcdefghijklmnopqrstuvwxyz', minLength: 4 })

type Rewrite = {
  destination: string
  source: string
  title?: string
  listed?: boolean
}

const withProtocol = (input: string) =>
  input.startsWith('http') ? input : `https://${input}`

const promptDestination = async () =>
  unwrap(
    await p.text({
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
  return unwrap(await p.confirm({ message: 'List it publicly on /rewrite?' }))
}

const fetchTitle = async (destination: string) => {
  const response = await fetch(destination)
  const $ = cheerio.load(await response.text())
  // .first() skips the <title> elements inside inline SVGs
  const title = $('title').first().text().trim()
  return { title: title || 'Undisclosure meta', url: response.url }
}

export default async function rewrite(ctx: Context) {
  const input = ctx.arg ?? (await promptDestination())
  const destination = new URL(withProtocol(input)).href

  const filename = abs('service/router/rewrites.json')
  const rewrites = await readJson<Rewrite[]>(filename, [])
  const taken = (url: string) =>
    rewrites.some((rewrite) => rewrite.destination === url)
  if (taken(destination)) {
    throw Error('This destination is already on rewrites')
  }

  const source = `/r/${tiny.encode([rewrites.length])}`
  // sources persist forever: a sqids code must not shadow an old hashids one
  if (rewrites.some((rewrite) => rewrite.source === source)) {
    throw Error(`The code ${source} is already taken`)
  }

  const listed = await resolveListed(ctx)

  const spin = p.spinner()
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
