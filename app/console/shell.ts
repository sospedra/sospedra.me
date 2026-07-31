import { SITE_URL } from '../../service/site.ts'

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

export const EYE_ART =
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣀⣀\n⠀⠀⠀⠀⠀⠀⠀⣀⡤⠴⠒⢚⣉⣭⠭⠴⠶⠶⠶⠶⠶⠶⠬⣭⣍⣙⠒⠲⠤⣄⡀\n⠀⠀⠀⣀⠴⠚⠉⠀⢀⣤⠞⠋⠉⠀⣀⣠⣤⣤⣤⣤⣤⣤⣀⡀⠀⠉⠛⢶⣄⠀⠈⠙⠲⢄⡀\n⠀⣠⠊⠁⠀⠀⠀⢠⡟⠁⠀⠀⣰⣾⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠙⣧⠀⠀⠀⠀⠉⢢⡀\n⠉⠳⡀⠀⠀⠀⠀⠸⣧⠀⠀⠀⢻⣿⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⢠⡿⠀⠀⠀⠀⠀⡰⠊\n⠀⠀⠈⠓⢤⣀⠀⠀⠙⠷⣄⡀⠀⠈⠛⠻⠿⠿⠿⠿⠿⠿⠛⠋⠀⠀⣀⣴⠟⠁⠀⢀⣠⠔⠋\n⠀⠀⠀⠀⠀⠈⠉⠒⠦⢤⣈⣙⠛⠶⠦⢤⣤⣤⣤⣤⣤⣤⠤⠶⠒⢋⣉⣠⠤⠖⠊⠉\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠙⠒⠒⠒⠒⠒⠒⠒⠚⠉⠉⠉'

// each animation is a frame loop; the view cycles them on a timer
const runFrames = [
  '   O    \n  /|\\   \n  / \\   ',
  '   O    \n  /|\\   \n  |\\    ',
  '   O    \n  \\|/   \n  / \\   ',
  '   O    \n  /|\\   \n   /\\   ',
]

const catFrames = [
  ' /\\_/\\  \n( o.o ) \n > ^ <  ',
  ' /\\_/\\  \n( -.- ) \n > ^ <  ',
  ' /\\_/\\  \n( o.o )~\n > ^ <  ',
]

const waveFrames = [
  '  ~~~~        ~~~~         ~~~~   \n><>   ~~    ~~    ~~     ~~    ~~ \n        ~~~~        ~~~~~        ~',
  ' ~~~~        ~~~~         ~~~~    \n~  ><>~    ~~    ~~     ~~    ~~  \n       ~~~~        ~~~~~        ~~',
  '~~~~        ~~~~         ~~~~     \n    ~~><> ~~    ~~     ~~    ~~   \n      ~~~~        ~~~~~        ~~~',
  '~~~        ~~~~         ~~~~      \n   ~~    ><>   ~~     ~~    ~~    \n     ~~~~        ~~~~~        ~~~~',
  '~~        ~~~~         ~~~~       \n  ~~    ~~ ><>  ~~     ~~    ~~   \n    ~~~~        ~~~~~        ~~~~ ',
  '~        ~~~~         ~~~~        \n ~~    ~~    ~~><>~~     ~~    ~~ \n   ~~~~        ~~~~~        ~~~~  ',
]

const ANIMATIONS: Record<string, string[]> = {
  run: runFrames,
  cat: catFrames,
  wave: waveFrames,
}

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

export const codeOf = (link: LinkEntry) => link.source.split('/').at(-1) ?? ''

export const joinPath = (segments: string[]) =>
  segments.length ? `/${segments.join('/')}` : '/'

const entriesAt = (paths: string[], dir: string[]) => {
  const prefix = dir.length ? `${joinPath(dir)}/` : '/'
  const dirs = new Set<string>()
  const files = new Set<string>()

  for (const path of paths) {
    if (!path.startsWith(prefix)) continue
    const [head = '', ...tail] = path.slice(prefix.length).split('/')
    const bucket = tail.length ? dirs : files
    bucket.add(head)
  }

  return { dirs: [...dirs].sort(), files: [...files].sort() }
}

type Resolved = { kind: 'dir' | 'file'; segments: string[] }

const findCaseless = (names: string[], query: string) =>
  names.find((name) => name.toLowerCase() === query.toLowerCase())

export const resolvePath = (
  paths: string[],
  cwd: string[],
  arg: string,
): Resolved | null => {
  const parts = arg.split('/').filter((part) => part && part !== '.')
  const segments = arg.startsWith('/') ? [] : [...cwd]

  for (const [index, part] of parts.entries()) {
    if (part === '..') {
      segments.pop()
      continue
    }
    const { dirs, files } = entriesAt(paths, segments)
    const dir = findCaseless(dirs, part)
    if (dir) {
      segments.push(dir)
      continue
    }
    const file = index === parts.length - 1 && findCaseless(files, part)
    if (!file) return null
    return { kind: 'file', segments: [...segments, file] }
  }

  return { kind: 'dir', segments }
}

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
  if (!args[0]) return { output: [], cwd: [] }
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

const COMMAND_NAMES = Object.keys(COMMANDS).sort()

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

export type Completion = { value: string; options: string[] }

const commonPrefix = (values: string[]) =>
  values.reduce((prefix, value) => {
    let length = 0
    while (
      length < prefix.length &&
      prefix[length]?.toLowerCase() === value[length]?.toLowerCase()
    ) {
      length++
    }
    return prefix.slice(0, length)
  })

// dirs complete to "name/" so the next tab descends, leaves get a space
const finishMatch = (match: string) =>
  match.endsWith('/') ? match : `${match} `

const argMatches = (
  ctx: ShellContext,
  token: string,
  directoriesOnly = false,
): string[] => {
  const cut = token.lastIndexOf('/') + 1
  const base = token.slice(0, cut)
  const stem = token.slice(cut).toLowerCase()
  const scope = base
    ? resolvePath(ctx.paths, ctx.cwd, base)
    : { kind: 'dir' as const, segments: ctx.cwd }
  if (!scope || scope.kind === 'file') return []

  const { dirs, files } = entriesAt(ctx.paths, scope.segments)
  const codes = base || directoriesOnly ? [] : ctx.links.map(codeOf)
  return [
    ...dirs.map((dir) => `${base}${dir}/`),
    ...(directoriesOnly ? [] : files.map((file) => base + file)),
    ...codes,
  ].filter((candidate) => candidate.slice(cut).toLowerCase().startsWith(stem))
}

export type CompletionOptions = {
  directoryOnlyCommands?: readonly string[]
  extraCommandNames?: readonly string[]
}

export const complete = (
  ctx: ShellContext,
  input: string,
  options: CompletionOptions = {},
): Completion => {
  const head = input.slice(0, input.lastIndexOf(' ') + 1)
  const token = input.slice(head.length)
  const commandName = head.trim().split(' ')[0]?.toLowerCase() ?? ''
  const matches = head
    ? argMatches(
        ctx,
        token,
        options.directoryOnlyCommands?.includes(commandName),
      )
    : [...new Set([...COMMAND_NAMES, ...(options.extraCommandNames ?? [])])]
        .sort()
        .filter((name) => name.startsWith(token.toLowerCase()))

  if (matches.length === 0) return { value: input, options: [] }
  if (matches.length === 1) {
    return { value: head + finishMatch(matches[0]), options: [] }
  }
  return { value: head + commonPrefix(matches), options: matches }
}

export const HACKER_SOURCE = `#include <net/inet_sock.h>
#include <crypto/aes.h>
#include <vault/phosphor.h>

static u8 session_key[AES_KEYSIZE_256];
static struct socket *uplink;

static int spoof_ttl(struct sk_buff *skb, u8 ttl) {
  struct iphdr *ip = ip_hdr(skb);
  if (!ip) return -EINVAL;
  ip->ttl = ttl;
  ip->check = 0;
  ip->check = ip_fast_csum((u8 *)ip, ip->ihl);
  return 0;
}

static int handshake(const char *host, u16 port) {
  struct sockaddr_in addr = { .sin_family = AF_INET };
  int err = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &uplink);
  if (err < 0) return err;
  addr.sin_port = htons(port);
  addr.sin_addr.s_addr = in_aton(host);
  pr_info("s-dos: tunneling to %s:%u\\n", host, port);
  return uplink->ops->connect(uplink, (struct sockaddr *)&addr,
                              sizeof(addr), O_NONBLOCK);
}

static void derive_key(const u8 *seed, size_t len) {
  struct crypto_shash *tfm = crypto_alloc_shash("sha256", 0, 0);
  SHASH_DESC_ON_STACK(desc, tfm);
  desc->tfm = tfm;
  crypto_shash_digest(desc, seed, len, session_key);
  crypto_free_shash(tfm);
  memzero_explicit((void *)seed, len);
}

static int sweep_sector(struct vault_dev *dev, sector_t lba) {
  struct bio *bio = bio_alloc(dev->bdev, 1, REQ_OP_READ, GFP_KERNEL);
  bio->bi_iter.bi_sector = lba;
  bio->bi_end_io = sector_leaked;
  submit_bio(bio);
  return atomic_inc_return(&dev->sectors_owned);
}

int inject_payload(struct vault_dev *dev) {
  u64 offset = 0x7ffe0000;
  int hops;
  derive_key(dev->entropy, sizeof(dev->entropy));
  for (hops = 0; hops < 64; hops++) {
    if (handshake("10.19.85.1", 5150 + hops) == 0) break;
    offset ^= rol64(offset, hops & 31);
  }
  pr_warn("s-dos: perimeter breached at 0x%llx\\n", offset);
  return sweep_sector(dev, offset >> 9);
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("guest");
MODULE_DESCRIPTION("drive S: perimeter audit");
`
