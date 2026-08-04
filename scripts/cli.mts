import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import * as clack from '@clack/prompts'
import createPaper from './commands/create-paper.mts'
import { readingCommand, resizeCommand } from './commands/paper-sync.mts'
import rewrite from './commands/rewrite.mts'
import { type Context, unwrap } from './prompts.mts'

type Command = {
  hint: string
  run: (context: Context) => Promise<string>
}

type EnvRequirement = {
  file: string
  key: string
}

type ScriptOptions = {
  hint: string
  head: string[]
  done: string
  env?: EnvRequirement
}

type SequenceOptions = {
  hint: string
  steps: string[][]
  done: string
}

const invoke = (args: string[]) => {
  const { status } = spawnSync('node', args, { stdio: 'inherit' })
  if (status !== 0) {
    throw Error(`node ${args.join(' ')} exited with ${status ?? 'a signal'}`)
  }
}

const envArgs = (env: EnvRequirement | undefined) => {
  if (!env) return []
  if (!existsSync(env.file)) {
    throw Error(
      `${env.file} is missing and the script reads ${env.key} from it`,
    )
  }
  return [`--env-file=${env.file}`]
}

const script = ({ hint, head, done, env }: ScriptOptions): Command => ({
  hint,
  run: async ({ rest }) => {
    invoke([...envArgs(env), ...head, ...rest])
    return done
  },
})

const sequence = ({ hint, steps, done }: SequenceOptions): Command => ({
  hint,
  run: async () => {
    for (const step of steps) invoke(step)
    return done
  },
})

const COMMANDS = {
  'boombox:songs': script({
    hint: 'Maintain the boombox song set',
    head: ['scripts/boombox/songs.ts'],
    done: 'Boombox songs done',
    env: { file: '.env.local', key: 'BLOB_READ_WRITE_TOKEN' },
  }),
  'create-paper': {
    hint: 'Scaffold a paper and sync its assets',
    run: createPaper,
  },
  'geo:data:build': script({
    hint: 'Build the Meridian corpus assets',
    head: ['scripts/geo/build-assets.mjs'],
    done: 'Corpus assets built',
  }),
  'geo:data:import': script({
    hint: 'Import the Meridian source corpus',
    head: ['scripts/geo/import-corpus.ts'],
    done: 'Corpus imported',
  }),
  'geo:data:validate': sequence({
    hint: 'Validate the Meridian lexicon, corpus, and challenge',
    steps: [
      ['scripts/geo/validate-country-lexicon.ts'],
      ['scripts/geo/validate-corpus.ts'],
      ['scripts/geo/validate-challenge.ts'],
    ],
    done: 'Meridian data is valid',
  }),
  'geo:generate': script({
    hint: 'Generate the Meridian daily challenge',
    head: ['scripts/geo/generate-challenge.ts'],
    done: 'Challenge generated',
  }),
  reading: { hint: 'Recompute reading times', run: readingCommand },
  resize: { hint: 'Resize paper images into public/', run: resizeCommand },
  rewrite: { hint: 'Shorten a URL into /r/*', run: rewrite },
  'travel:radio:validate': script({
    hint: 'Check the travel radio corpus offline',
    head: ['scripts/travel/verify-radio-streams.ts'],
    done: 'Travel radio corpus is valid',
  }),
  'travel:radio:verify': script({
    hint: 'Probe the travel radio streams live',
    head: ['scripts/travel/verify-radio-streams.ts', '--live'],
    done: 'Travel radio streams verified',
  }),
  'w98:radio:validate': script({
    hint: 'Check the RealPlayer corpus offline',
    head: ['scripts/w98/verify-realplayer-streams.ts'],
    done: 'RealPlayer corpus is valid',
  }),
  'w98:radio:verify': script({
    hint: 'Probe the RealPlayer streams live',
    head: ['scripts/w98/verify-realplayer-streams.ts', '--live'],
    done: 'RealPlayer streams verified',
  }),
} satisfies Record<string, Command>

type CommandName = keyof typeof COMMANDS

const isCommand = (name: string): name is CommandName => name in COMMANDS

const promptCommand = async () =>
  unwrap(
    await clack.select({
      message: 'What do you want to run?',
      options: (Object.keys(COMMANDS) as CommandName[]).map((name) => ({
        value: name,
        hint: COMMANDS[name].hint,
      })),
    }),
  )

const [requested, ...rest] = process.argv.slice(2)
const { values, positionals } = parseArgs({
  args: rest,
  options: { hidden: { type: 'boolean' } },
  strict: false,
  allowPositionals: true,
})
const context: Context = {
  arg: positionals[0],
  hidden: values.hidden === true,
  rest,
}

const resolveCommand = async () => {
  if (requested === undefined) return promptCommand()
  if (!isCommand(requested)) {
    const known = Object.keys(COMMANDS).join(', ')
    throw Error(`Unknown command '${requested}'. Try one of: ${known}`)
  }
  return requested
}

clack.intro('sospedra.me')

try {
  const name = await resolveCommand()
  clack.outro(await COMMANDS[name].run(context))
} catch (error) {
  clack.cancel(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
