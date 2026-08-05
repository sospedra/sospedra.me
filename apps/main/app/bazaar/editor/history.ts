'use client'

import { createExternalStore } from 'services/external-store'
import type { DecorDoc } from '../decor'
import { decorStore } from '../decor-store'

type ChromeMap = Record<string, unknown>

export type Command =
  | { scope: 'doc'; before: DecorDoc; after: DecorDoc }
  | { scope: 'chrome'; before: ChromeMap; after: ChromeMap }

const HISTORY_CAP = 200

export const historyStore = createExternalStore<{
  past: Command[]
  future: Command[]
}>({ past: [], future: [] })

/* the chrome store owns DOM side effects, so it registers its own applier
   instead of history importing it back */
let applyChrome: (map: ChromeMap) => void = () => {}

export const registerChromeApplier = (apply: (map: ChromeMap) => void) => {
  applyChrome = apply
}

export const record = (command: Command) => {
  const { past } = historyStore.get()
  historyStore.set({
    past: [...past.slice(-HISTORY_CAP + 1), command],
    future: [],
  })
}

const applyCommand = (command: Command, direction: 'undo' | 'redo') => {
  const target = direction === 'undo' ? command.before : command.after
  if (command.scope === 'doc') decorStore.set(target as DecorDoc)
  else applyChrome(target as ChromeMap)
}

export const undo = () => {
  const { past, future } = historyStore.get()
  const command = past.at(-1)
  if (!command) return
  applyCommand(command, 'undo')
  historyStore.set({ past: past.slice(0, -1), future: [command, ...future] })
}

export const redo = () => {
  const { past, future } = historyStore.get()
  const command = future[0]
  if (!command) return
  applyCommand(command, 'redo')
  historyStore.set({ past: [...past, command], future: future.slice(1) })
}
