const fs = require('fs')
const { join } = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const exists = promisify(fs.exists)
const mkdir = promisify(fs.mkdir)

module.exports = {}

module.exports.read = async function ioread(filename, empty) {
  const raw = (await exists(filename))
    ? await readFile(filename, 'utf8')
    : empty

  try {
    return JSON.parse(raw)
  } catch (ex) {
    return raw
  }
}

module.exports.write = async function iowrite(filename, data, doesStr = true) {
  return await writeFile(filename, doesStr ? JSON.stringify(data) : data)
}

module.exports.dir = async function iodir(pathname) {
  const dirname = join(process.cwd(), pathname)
  return (await readdir(dirname)).map((file) => join(dirname, file))
}

module.exports.abs = function ioabs(pathname) {
  return join(process.cwd(), pathname)
}

module.exports.exists = async function ioexists(filename) {
  return await exists(filename)
}

module.exports.mkdir = async function iomkdir(filename) {
  return await mkdir(filename)
}

module.exports.assign = function ioassign(data, travel, patch) {
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
