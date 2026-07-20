import { parseArgs } from 'node:util'
import * as p from '@clack/prompts'
import createPaper from './commands/create-paper.mts'
import { readingCommand, resizeCommand } from './commands/paper-sync.mts'
import rewrite from './commands/rewrite.mts'
import { type Context, unwrap } from './prompts.mts'

type Command = {
  hint: string
  run: (ctx: Context) => Promise<string>
}

const COMMANDS = {
  'create-paper': {
    hint: 'Scaffold a paper and sync its assets',
    run: createPaper,
  },
  reading: { hint: 'Recompute reading times', run: readingCommand },
  resize: { hint: 'Resize paper images into public/', run: resizeCommand },
  rewrite: { hint: 'Shorten a URL into /r/*', run: rewrite },
} satisfies Record<string, Command>

type CommandName = keyof typeof COMMANDS

const isCommand = (name: string): name is CommandName => name in COMMANDS

const promptCommand = async () =>
  unwrap(
    await p.select({
      message: 'What do you want to run?',
      options: (Object.keys(COMMANDS) as CommandName[]).map((name) => ({
        value: name,
        hint: COMMANDS[name].hint,
      })),
    }),
  )

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { hidden: { type: 'boolean' } },
})
const [requested, arg] = positionals

p.intro('sospedra.me')

if (requested !== undefined && !isCommand(requested)) {
  const known = Object.keys(COMMANDS).join(', ')
  p.cancel(`Unknown command '${requested}'. Try one of: ${known}`)
  process.exit(1)
}

const name = requested ?? (await promptCommand())

try {
  p.outro(await COMMANDS[name].run({ arg, hidden: values.hidden ?? false }))
} catch (ex) {
  p.cancel(ex instanceof Error ? ex.message : String(ex))
  process.exit(1)
}
