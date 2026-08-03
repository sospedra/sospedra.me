// Linear undo history capped by bytes, not entries: 24 MB holds 23 default-
// size snapshots and fewer after a canvas grow.
export type Snapshot = {
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

export type History = {
  past: readonly Snapshot[]
  future: readonly Snapshot[]
  cap: number
}

export const HISTORY_CAP = 24 * 1024 * 1024

export const createHistory = (cap: number = HISTORY_CAP): History => ({
  past: [],
  future: [],
  cap,
})

const bytes = (snapshots: readonly Snapshot[]): number =>
  snapshots.reduce((sum, snapshot) => sum + snapshot.data.byteLength, 0)

export const push = (history: History, snapshot: Snapshot): History => {
  const past = [...history.past, snapshot]
  while (past.length > 0 && bytes(past) > history.cap) past.shift()
  return { past, future: [], cap: history.cap }
}

export type Restore = { history: History; snapshot: Snapshot }

export const undo = (history: History, current: Snapshot): Restore | null => {
  const snapshot = history.past.at(-1)
  if (!snapshot) return null
  return {
    snapshot,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      cap: history.cap,
    },
  }
}

export const redo = (history: History, current: Snapshot): Restore | null => {
  const snapshot = history.future.at(-1)
  if (!snapshot) return null
  return {
    snapshot,
    history: {
      past: [...history.past, current],
      future: history.future.slice(0, -1),
      cap: history.cap,
    },
  }
}
