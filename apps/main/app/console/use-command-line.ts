import { clamp } from 'es-toolkit'
import type React from 'react'
import { useRef, useState } from 'react'
import type { ShellContext } from './command-shell'
import { CONSOLE_COMMANDS } from './console-commands'
import { complete } from './console-complete'
import type { Execute } from './console-output'
import type { ConsoleOutput } from './console-reducer'

export type CommandLine = {
  value: string
  setValue: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export const useCommandLine = (deps: {
  context: ShellContext
  execute: Execute
  note: (output: ConsoleOutput[]) => void
  clickKey: () => void
}): CommandLine => {
  const { context, execute, note, clickKey } = deps
  const [value, setValue] = useState('')
  const historyRef = useRef({ list: [] as string[], cursor: 0 })

  const submit = () => {
    const command = value.trim()
    if (command) {
      historyRef.current.list.push(command)
      historyRef.current.cursor = historyRef.current.list.length
    }
    execute([command])
    setValue('')
  }

  const recall = (event: React.KeyboardEvent, step: number) => {
    event.preventDefault()
    const { list, cursor } = historyRef.current
    if (list.length === 0) return
    const next = clamp(cursor + step, 0, list.length)
    historyRef.current.cursor = next
    setValue(list[next] ?? '')
  }

  const autocomplete = (event: React.KeyboardEvent) => {
    event.preventDefault()
    const completion = complete(context, value, {
      directoryOnlyCommands: CONSOLE_COMMANDS,
      extraCommandNames: CONSOLE_COMMANDS,
    })
    setValue(completion.value)
    if (completion.options.length > 1) {
      note([
        { kind: 'text', text: completion.options.join('   '), tone: 'dim' },
      ])
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    clickKey()
    // Enter can launch hacker/animate; keep it off the window listener so the
    // same keystroke doesn't immediately count as the "any key stops" trigger
    if (event.key === 'Enter') {
      event.stopPropagation()
      return submit()
    }
    // Shift+Tab stays free so keyboard focus can leave the prompt (WCAG 2.1.2)
    if (event.key === 'Tab' && !event.shiftKey) return autocomplete(event)
    if (event.key === 'Escape') return event.currentTarget.blur()
    if (event.key === 'ArrowUp') return recall(event, -1)
    if (event.key === 'ArrowDown') return recall(event, 1)
  }

  return { value, setValue, onKeyDown }
}
