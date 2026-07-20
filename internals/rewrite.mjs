import Hashids from 'hashids'
import * as cheerio from 'cheerio'
import { abs, readJson, writeJson } from './io.mjs'

const tiny = new Hashids('1337', 4, 'abcdefghijklmnopqrstuvwxyz')

try {
  const input = process.argv[2]
  const hidden = process.argv[3] === 'false'
  if (!input) {
    throw Error(`No 'destination' is provided. Try 'pnpm cmd:rewrite google.com'`)
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

  await writeJson(filename, [
    ...file,
    {
      destination: response.url,
      title,
      source: `/r/${tiny.encode(file.length)}`,
      listed: !hidden,
    },
  ])
} catch (ex) {
  console.log(`\n🚨  ${ex.message}\n`)
}
