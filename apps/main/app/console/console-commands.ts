import { HELP } from './command-shell'
import { resolvePath } from './console-path'
import type { ConsoleResult } from './console-reducer'

export const CONSOLE_COMMANDS = ['tree'] as const

export const CONSOLE_HELP: ReadonlyArray<readonly [string, string]> = [
  ...HELP.slice(0, 2),
  ['tree [path]', 'browse a collapsible directory tree'],
  ...HELP.slice(2),
]

export const runTreeCommand = (
  paths: string[],
  cwd: string[],
  args: string[],
): ConsoleResult => {
  if (args.length > 1 || args.some((arg) => arg.startsWith('-'))) {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: 'Usage: TREE [path]',
          tone: 'dim',
        },
      ],
    }
  }

  const arg = args[0]
  const target = arg
    ? resolvePath(paths, cwd, arg)
    : { kind: 'dir' as const, segments: cwd }

  if (!target) {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: `Path not found — ${arg}`,
          tone: 'error',
        },
      ],
    }
  }
  if (target.kind === 'file') {
    return {
      cwd,
      output: [
        {
          kind: 'text',
          text: `Not a directory — ${arg}`,
          tone: 'error',
        },
      ],
    }
  }

  return {
    cwd,
    output: [{ kind: 'tree', segments: target.segments }],
  }
}
