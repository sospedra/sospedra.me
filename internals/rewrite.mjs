import * as cheerio from 'cheerio'
import Sqids from 'sqids'
import { abs, readJson, writeJson } from './io.mjs'

const tiny = new Sqids({ alphabet: 'abcdefghijklmnopqrstuvwxyz', minLength: 4 })

try {
  const input = process.argv[2]
  const hidden = process.argv[3] === 'false'
  if (!input) {
    throw Error(
      `No 'destination' is provided. Try 'pnpm cmd:rewrite google.com'`,
    )
  }

  const destination = input.startsWith('http') ? input : `https://${input}`
  const response = await fetch(destination)
  const $ = cheerio.load(await response.text())
  const title = $('title').text() || 'Undisclosure meta'
  const filename = abs('service/router/rewrites.json')
  const file = await readJson(filename, [])

  if (file.find((rewrite) => rewrite.destination === destination)) {
    throw Error('This destination is already on rewrites')
  }

  const source = `/r/${tiny.encode([file.length])}`
  // sources persist forever: a sqids code must not shadow an old hashids one
  if (file.find((rewrite) => rewrite.source === source)) {
    throw Error(`The code ${source} is already taken`)
  }

  await writeJson(filename, [
    ...file,
    {
      destination: response.url,
      title,
      source,
      listed: !hidden,
    },
  ])
} catch (ex) {
  console.log(`\n🚨  ${ex.message}\n`)
}
