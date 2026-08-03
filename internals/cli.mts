import { spawnSync } from 'node:child_process'
import * as p from '@clack/prompts'
import createPaper from './commands/create-paper.mts'
import { readingCommand, resizeCommand } from './commands/paper-sync.mts'
import rewrite from './commands/rewrite.mts'
import { type Context, unwrap } from './prompts.mts'

type Command = {
  hint: string
  run: (ctx: Context) => Promise<string>
}

const invoke = (args: string[]) => {
  const { status } = spawnSync('node', args, { stdio: 'inherit' })
  if (status !== 0) {
    throw Error(`node ${args.join(' ')} exited with ${status ?? 'a signal'}`)
  }
}

const script = (hint: string, head: string[], done: string): Command => ({
  hint,
  run: async ({ rest }) => {
    invoke([...head, ...rest])
    return done
  },
})

const sequence = (hint: string, steps: string[][], done: string): Command => ({
  hint,
  run: async () => {
    for (const step of steps) invoke(step)
    return done
  },
})

const COMMANDS = {
  'boombox:songs': script(
    'Maintain the boombox song set',
    ['--env-file=.env.local', 'scripts/boombox/songs.ts'],
    'Boombox songs done',
  ),
  'create-paper': {
    hint: 'Scaffold a paper and sync its assets',
    run: createPaper,
  },
  'geo:data:build': script(
    'Build the Meridian corpus assets',
    ['scripts/geo/build-assets.mjs'],
    'Corpus assets built',
  ),
  'geo:data:import': script(
    'Import the Meridian source corpus',
    ['scripts/geo/import-corpus.ts'],
    'Corpus imported',
  ),
  'geo:data:validate': sequence(
    'Validate the Meridian lexicon, corpus, and challenge',
    [
      ['scripts/geo/validate-country-lexicon.ts'],
      ['scripts/geo/validate-corpus.ts'],
      ['scripts/geo/validate-challenge.ts'],
    ],
    'Meridian data is valid',
  ),
  'geo:generate': script(
    'Generate the Meridian daily challenge',
    ['scripts/geo/generate-challenge.ts'],
    'Challenge generated',
  ),
  reading: { hint: 'Recompute reading times', run: readingCommand },
  resize: { hint: 'Resize paper images into public/', run: resizeCommand },
  rewrite: { hint: 'Shorten a URL into /r/*', run: rewrite },
  'travel:radio:validate': script(
    'Check the travel radio corpus offline',
    ['scripts/travel/verify-radio-streams.ts'],
    'Travel radio corpus is valid',
  ),
  'travel:radio:verify': script(
    'Probe the travel radio streams live',
    ['scripts/travel/verify-radio-streams.ts', '--live'],
    'Travel radio streams verified',
  ),
  'w98:radio:validate': script(
    'Check the RealPlayer corpus offline',
    ['scripts/w98/verify-realplayer-streams.ts'],
    'RealPlayer corpus is valid',
  ),
  'w98:radio:verify': script(
    'Probe the RealPlayer streams live',
    ['scripts/w98/verify-realplayer-streams.ts', '--live'],
    'RealPlayer streams verified',
  ),
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

const [requested, ...rest] = process.argv.slice(2)
const hidden = rest.includes('--hidden')
const arg = rest.find((token) => !token.startsWith('--'))

p.intro('sospedra.me')

if (requested !== undefined && !isCommand(requested)) {
  const known = Object.keys(COMMANDS).join(', ')
  p.cancel(`Unknown command '${requested}'. Try one of: ${known}`)
  process.exit(1)
}

const name = requested ?? (await promptCommand())

try {
  p.outro(await COMMANDS[name].run({ arg, hidden, rest }))
} catch (ex) {
  p.cancel(ex instanceof Error ? ex.message : String(ex))
  process.exit(1)
}
