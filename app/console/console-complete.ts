import { filter, pipe, uniq } from 'es-toolkit/fp'
import { COMMAND_NAMES, codeOf, type ShellContext } from './command-shell.ts'
import { entriesAt, resolvePath } from './console-path.ts'

const alphabetical = (names: readonly string[]) => names.toSorted()

export type Completion = { value: string; options: string[] }

export type CompletionOptions = {
  directoryOnlyCommands?: readonly string[]
  extraCommandNames?: readonly string[]
}

const sharedPrefixLength = (prefix: string, value: string) => {
  let length = 0
  while (
    length < prefix.length &&
    prefix[length]?.toLowerCase() === value[length]?.toLowerCase()
  ) {
    length += 1
  }
  return length
}

const commonPrefix = (values: string[]) => {
  const [first = '', ...rest] = values
  let prefix = first
  for (const value of rest) {
    prefix = prefix.slice(0, sharedPrefixLength(prefix, value))
  }
  return prefix
}

// dirs complete to "name/" so the next tab descends, leaves get a space
const finishMatch = (match: string) =>
  match.endsWith('/') ? match : `${match} `

const argMatches = (
  ctx: ShellContext,
  token: string,
  directoriesOnly = false,
): string[] => {
  const stemStart = token.lastIndexOf('/') + 1
  const base = token.slice(0, stemStart)
  const stem = token.slice(stemStart).toLowerCase()
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
  ].filter((candidate) =>
    candidate.slice(stemStart).toLowerCase().startsWith(stem),
  )
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
    : pipe(
        [...COMMAND_NAMES, ...(options.extraCommandNames ?? [])],
        uniq(),
        alphabetical,
        filter((name) => name.startsWith(token.toLowerCase())),
      )

  if (matches.length === 0) return { value: input, options: [] }
  if (matches.length === 1) {
    return { value: head + finishMatch(matches[0]), options: [] }
  }
  return { value: head + commonPrefix(matches), options: matches }
}
