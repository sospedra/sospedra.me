const io = require('./io')

module.exports = function createScript(name, clbk) {
  const script = async () => {
    try {
      const paper = process.argv[2]

      if (!paper) {
        throw Error(`No 'paper' is provided. Try 'yarn ${name} hello-world'`)
      }

      for (file of await io.dir(`/pages/papers/${paper}`)) {
        clbk(file)
      }
    } catch (ex) {
      console.log(`\n🚨  ${ex.message}\n`)
    }
  }

  script.name = name

  return script
}
