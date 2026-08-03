import { SITE_URL } from '../../services/site.ts'
import { ANIMATIONS } from './console-art.ts'
import { entriesAt, joinPath, resolvePath } from './console-path.ts'

export type LinkEntry = {
  source: string
  title: string
  destination: string
}

export type Tone = 'dim' | 'bright' | 'error'

export type Output =
  | { kind: 'text'; text: string; tone?: Tone }
  | { kind: 'listing'; path: string; dirs: string[]; files: string[] }
  | { kind: 'links' }
  | { kind: 'help' }

export type Effect =
  | { kind: 'open'; href: string }
  | { kind: 'copy'; text: string }
  | { kind: 'clear' }
  | { kind: 'exit' }
  | { kind: 'hacker' }
  | { kind: 'animate'; frames: string[] }
  | { kind: 'toggle-audio' }

export type ShellResult = { output: Output[]; cwd: string[]; effect?: Effect }

export type ShellContext = {
  paths: string[]
  links: LinkEntry[]
  cwd: string[]
}

export const HELP = [
  ['help', 'this index'],
  ['ls [path]', 'list a directory (alias: dir)'],
  ['cd <dir>', 'change directory — .. climbs, / is root'],
  ['pwd', 'print the working directory'],
  ['open <path|code>', 'launch an asset or short link'],
  ['url <path|code>', 'print and copy the canonical url'],
  ['links', 'the short-link registry'],
  ['hacker', 'look busy · any key hacks, esc bails'],
  ['animate --<name>', 'play an ascii loop · --list for names'],
  ['audio', 'toggle the boot chime and drive hum'],
  ['clear', 'wipe the phosphor (alias: cls)'],
  ['exit', 'close the session'],
] as const

const HOME: string[] = []

export const codeOf = (link: LinkEntry) => link.source.split('/').at(-1) ?? ''

const text = (value: string, tone?: Tone): Output => ({
  kind: 'text',
  text: value,
  tone,
})

const fault = (value: string): Output => text(value, 'error')

type Command = (ctx: ShellContext, args: string[]) => ShellResult

const stay = (
  ctx: ShellContext,
  output: Output[],
  effect?: Effect,
): ShellResult => ({ output, cwd: ctx.cwd, effect })

const findLink = (links: LinkEntry[], arg: string) =>
  links.find((link) => codeOf(link) === arg.toLowerCase())

const ls: Command = (ctx, args) => {
  const arg = args.find((value) => !value.startsWith('-'))
  const target = arg
    ? resolvePath(ctx.paths, ctx.cwd, arg)
    : { kind: 'dir' as const, segments: ctx.cwd }

  if (!target) return stay(ctx, [fault(`File not found — ${arg}`)])
  if (target.kind === 'file') {
    const path = joinPath(target.segments.slice(0, -1))
    const name = target.segments.at(-1) ?? ''
    return stay(ctx, [{ kind: 'listing', path, dirs: [], files: [name] }])
  }

  const { dirs, files } = entriesAt(ctx.paths, target.segments)
  return stay(ctx, [
    { kind: 'listing', path: joinPath(target.segments), dirs, files },
  ])
}

const cd: Command = (ctx, args) => {
  if (!args[0]) return { output: [], cwd: HOME }
  const target = resolvePath(ctx.paths, ctx.cwd, args[0])
  if (!target) return stay(ctx, [fault(`Path not found — ${args[0]}`)])
  if (target.kind === 'file') {
    return stay(ctx, [fault(`Not a directory — ${args[0]}`)])
  }
  return { output: [], cwd: target.segments }
}

const pwd: Command = (ctx) => stay(ctx, [text(joinPath(ctx.cwd))])

const open: Command = (ctx, args) => {
  const arg = args[0]
  if (!arg) return stay(ctx, [text('Usage: OPEN <path | link code>', 'dim')])

  const link = findLink(ctx.links, arg)
  if (link) {
    return stay(ctx, [text(`Opening ${link.destination}`, 'dim')], {
      kind: 'open',
      href: link.destination,
    })
  }

  const target = resolvePath(ctx.paths, ctx.cwd, arg)
  if (!target) return stay(ctx, [fault(`File not found — ${arg}`)])
  if (target.kind === 'dir') {
    return stay(ctx, [fault(`Cannot open a directory — try CD ${arg}`)])
  }

  const href = joinPath(target.segments)
  return stay(ctx, [text(`Opening ${href}`, 'dim')], { kind: 'open', href })
}

const url: Command = (ctx, args) => {
  const arg = args[0]
  if (!arg) return stay(ctx, [text('Usage: URL <path | link code>', 'dim')])

  const link = findLink(ctx.links, arg)
  if (link) {
    const short = `${SITE_URL}${link.source}`
    return stay(ctx, [text(short, 'bright')], { kind: 'copy', text: short })
  }

  const target = resolvePath(ctx.paths, ctx.cwd, arg)
  if (!target) return stay(ctx, [fault(`File not found — ${arg}`)])
  if (target.kind === 'dir') return stay(ctx, [fault(`Not a file — ${arg}`)])

  const href = `${SITE_URL}${joinPath(target.segments)}`
  return stay(ctx, [text(href, 'bright')], { kind: 'copy', text: href })
}

const links: Command = (ctx) => stay(ctx, [{ kind: 'links' }])

const help: Command = (ctx) => stay(ctx, [{ kind: 'help' }])

const clear: Command = (ctx) => stay(ctx, [], { kind: 'clear' })

const exit: Command = (ctx) =>
  stay(ctx, [text('Session closed — returning to the street', 'dim')], {
    kind: 'exit',
  })

const whoami: Command = (ctx) =>
  stay(ctx, [text('guest · read-only clearance')])

const sudo: Command = (ctx) =>
  stay(ctx, [
    fault('guest is not in the sudoers file. This incident will be reported.'),
  ])

const format: Command = (ctx) =>
  stay(ctx, [fault('Access denied — drive S: is read-only')])

const hacker: Command = (ctx) =>
  stay(ctx, [text('Intrusion shell engaged · mash keys · ESC bails', 'dim')], {
    kind: 'hacker',
  })

const audio: Command = (ctx) => stay(ctx, [], { kind: 'toggle-audio' })

const animate: Command = (ctx, args) => {
  const names = Object.keys(ANIMATIONS).sort()
  const flag = args.find((value) => value.startsWith('--'))?.slice(2)

  if (!flag || flag === 'list') {
    return stay(ctx, [
      text('Usage: ANIMATE --<name> · ESC stops', 'dim'),
      text(`Available: ${names.map((name) => `--${name}`).join('  ')}`),
    ])
  }

  const frames = ANIMATIONS[flag]
  if (!frames) return stay(ctx, [fault(`No animation named --${flag}`)])
  return stay(ctx, [text(`Playing --${flag} · ESC stops`, 'dim')], {
    kind: 'animate',
    frames,
  })
}

const COMMANDS: Record<string, Command> = {
  help,
  man: help,
  ls,
  dir: ls,
  cd,
  pwd,
  open,
  start: open,
  url,
  links,
  clear,
  cls: clear,
  exit,
  quit: exit,
  logout: exit,
  whoami,
  sudo,
  format,
  hacker,
  animate,
  audio,
  mute: audio,
  sound: audio,
}

export const COMMAND_NAMES = Object.keys(COMMANDS).sort()

export const runCommand = (ctx: ShellContext, input: string): ShellResult => {
  const [name = '', ...args] = input.trim().split(' ').filter(Boolean)
  if (!name) return { output: [], cwd: ctx.cwd }

  const command = COMMANDS[name.toLowerCase()]
  if (!command) {
    return stay(ctx, [
      fault(`Bad command or file name — ${name.toUpperCase()}`),
    ])
  }
  return command(ctx, args)
}
