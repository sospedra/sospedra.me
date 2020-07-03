const got = require('got')
const prompts = require('prompts')
const langmap = require('language-map')
const cheerio = require('cheerio')
const retext = require('retext')
const pos = require('retext-pos')
const keywords = require('retext-keywords')
const toString = require('nlcst-to-string')
const io = require('./io')

const flat = (array) => [
  ...new Set(
    array
      .flat()
      .filter((x) => x)
      .map((x) => x.toLowerCase()),
  ),
]

;(async function rewrite() {
  try {
    const input = process.argv[2]

    if (!input) {
      throw Error(
        `No 'url' is provided. Try 'yarn stack github.com/sospedra/rfm'`,
      )
    }

    const destination = input.startsWith('http') ? input : `https://${input}`
    const url = new URL(destination.toLowerCase())
    const filename = io.abs('service/stack/stack.json')
    const file = await io.read(filename)
    const suggestions = flat(file.map(({ categories }) => categories))
    const metadata = {
      route: '',
      name: '',
      title: '',
      description: '',
      isGithub: false,
      tags: [],
      categories: [],
    }

    // fetch metadata
    if (url.hostname === 'github.com') {
      const { body } = await got(
        `https://api.github.com/repos${url.pathname}`,
        {
          headers: {
            Accept: 'application/vnd.github.mercy-preview+json',
          },
        },
      )
      const payload = JSON.parse(body)

      metadata.isGithub = true
      metadata.description = payload.description
      metadata.name = payload.name
      metadata.route = payload.html_url
      metadata.title = payload.full_name
      metadata.tags = flat([
        payload.language,
        payload.topics || [],
        flat([langmap[payload.language].aliases]),
        langmap[payload.language].aceMode,
      ])
    } else {
      const { body } = await got(destination)
      const $ = cheerio.load(body)

      metadata.route = destination
      metadata.name = url.hostname
      metadata.description = $("meta[name='description']").attr('content') || ''
      metadata.title = $('title').text() || ''

      retext()
        .use(pos)
        .use(keywords)
        .process(metadata.description, (_, { data }) => {
          data.keywords.forEach(function (keyword) {
            metadata.tags.push(toString(keyword.matches[0].node))
          })
        })

      metadata.tags = flat([
        metadata.tags,
        [$("meta[name='keywords']").attr('content')],
      ])
    }

    // confirm data
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
          throw Error(`New tech cancelled`)
        },
      },
    )

    // save data
    io.write(filename, [...file, tech])
  } catch (ex) {
    console.log(`\n🚨  ${ex.message}\n`)
  }
})()
