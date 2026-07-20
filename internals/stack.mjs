import prompts from 'prompts'
import langmap from 'language-map/languages.json' with { type: 'json' }
import * as cheerio from 'cheerio'
import { retext } from 'retext'
import retextPos from 'retext-pos'
import retextKeywords from 'retext-keywords'
import { toString } from 'nlcst-to-string'
import { abs, readJson, writeJson } from './io.mjs'

const flat = (array) => [
  ...new Set(
    array
      .flat()
      .filter(Boolean)
      .map((x) => x.toLowerCase()),
  ),
]

const extractKeywords = async (text) => {
  const file = await retext().use(retextPos).use(retextKeywords).process(text)
  return (file.data.keywords || []).map((keyword) =>
    toString(keyword.matches[0].node),
  )
}

const fetchGithubMetadata = async (url) => {
  const response = await fetch(`https://api.github.com/repos${url.pathname}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  const payload = await response.json()

  return {
    route: payload.html_url,
    name: payload.name,
    title: payload.full_name,
    description: payload.description,
    isGithub: true,
    tags: flat([
      payload.language,
      payload.topics || [],
      flat([langmap[payload.language].aliases]),
      langmap[payload.language].aceMode,
    ]),
    categories: [],
  }
}

const fetchWebMetadata = async (destination, url) => {
  const response = await fetch(destination)
  const $ = cheerio.load(await response.text())
  const description = $("meta[name='description']").attr('content') || ''

  return {
    route: destination,
    name: url.hostname,
    title: $('title').text() || '',
    description,
    isGithub: false,
    tags: flat([
      await extractKeywords(description),
      [$("meta[name='keywords']").attr('content')],
    ]),
    categories: [],
  }
}

try {
  const input = process.argv[2]
  if (!input) {
    throw Error(`No 'url' is provided. Try 'pnpm cmd:stack github.com/sospedra/rfm'`)
  }

  const destination = input.startsWith('http') ? input : `https://${input}`
  const url = new URL(destination.toLowerCase())
  const filename = abs('service/stack/stack.json')
  const file = await readJson(filename, [])
  const suggestions = flat(file.map(({ categories }) => categories))
  const metadata =
    url.hostname === 'github.com'
      ? await fetchGithubMetadata(url)
      : await fetchWebMetadata(destination, url)

  if (file.find(({ name }) => name === metadata.name)) {
    throw Error(`The tech ${metadata.name} is already on the stack`)
  }

  console.log('ℹ', 'Current categories', suggestions)
  const tech = await prompts(
    Object.entries(metadata).map(([name, initial]) => ({
      type: typeof initial === 'string' ? 'text' : 'list',
      name,
      message: `Set metadata property ${name}`,
      initial: initial.toString(),
    })),
    {
      onCancel: () => {
        throw Error('New tech cancelled')
      },
    },
  )

  // prompts 'list' answers arrive as arrays
  tech.isGithub = tech.isGithub?.[0] === 'true'

  await writeJson(filename, [tech, ...file])
} catch (ex) {
  console.log(`\n🚨  ${ex.message}\n`)
}
