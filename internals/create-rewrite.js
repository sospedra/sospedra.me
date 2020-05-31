const got = require('got')
const Hashids = require('hashids/cjs')
const io = require('./io')

const tiny = new Hashids('1337', 4, 'abcdefghijklmnopqrstuvwxyz')

;(async function createRewrite() {
  try {
    const input = process.argv[2]
    const hidden = process.argv[3] === 'false'

    if (!input) {
      throw Error(`No 'destination' is provided. Try 'yarn rewrite google.com'`)
    }

    const destination = input.startsWith('http') ? input : `https://${input}`
    const response = await got(destination)
    const title = response.body.match(/<title>(.*?)<\/title>/i)[1]
    const filename = io.abs('service/router/rewrites.json')
    const file = await io.read(filename)

    if (file.find((rewrite) => rewrite.destination === destination)) {
      throw Error('This destination is already on rewrites')
    } else {
      io.write(filename, [
        ...file,
        {
          destination: response.requestUrl,
          title,
          source: `/r/${tiny.encode(file.length)}`,
          listed: !hidden,
        },
      ])
    }
  } catch (ex) {
    console.log(`\n🚨  ${ex.message}\n`)
  }
})()
