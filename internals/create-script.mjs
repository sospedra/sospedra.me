import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export default function createScript(name, clbk) {
  return async () => {
    try {
      const paper = process.argv[2]
      if (!paper) {
        throw Error(
          `No 'paper' is provided. Try 'pnpm cmd:${name} {paper_name}'`,
        )
      }

      const dir = join(process.cwd(), 'content/papers', paper)
      for (const file of await readdir(dir)) {
        await clbk(join(dir, file))
      }
    } catch (ex) {
      console.log(`\n🚨  ${ex.message}\n`)
    }
  }
}
