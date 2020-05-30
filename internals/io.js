const fs = require('fs')
const { join } = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const exists = promisify(fs.exists)

module.exports = {}

module.exports.read = async function read(filename, empty) {
  const raw = (await exists(filename))
    ? await readFile(filename, 'utf8')
    : empty

  try {
    return JSON.parse(raw)
  } catch (ex) {
    return raw
  }
}

module.exports.write = async function write(filename, data, doesStr = true) {
  return await writeFile(filename, doesStr ? JSON.stringify(data) : data)
}

module.exports.dir = async function dir(pathname) {
  const dirname = join(process.cwd(), pathname)
  return (await readdir(dirname)).map((file) => join(dirname, file))
}

module.exports.abs = function abs(pathname) {
  return join(process.cwd(), pathname)
}

module.exports.assign = function assign(data, travel, patch) {
  return {
    ...data,
    [travel]:
      typeof patch === 'object'
        ? {
            ...(data[travel] || {}),
            ...patch,
          }
        : patch,
  }
}
