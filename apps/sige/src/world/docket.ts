// The external authority must publish its records once a process closes. Past
// the horizon an unmatched leaf is flagged, never auto-revealed (spec 8.2).
export type ReconcileStatus = 'matched' | 'pending' | 'overdue'

export type DocketRecord = {
  authorizationHash: string
  publishedAtHeight: number
  caseSummary: string
}

export type UnsealSighting = {
  authorizationHash: string
  anchorHeight: number
}

export type ReconcileEntry = {
  authorizationHash: string
  status: ReconcileStatus
}

export type DocketHorizon = {
  tipHeight: number
  horizonBlocks: number
}

export function reconcile(
  sightings: UnsealSighting[],
  docket: DocketRecord[],
  horizon: DocketHorizon,
): ReconcileEntry[] {
  const published = new Set(docket.map((r) => r.authorizationHash))
  return sightings.map((s) => {
    if (published.has(s.authorizationHash)) {
      return { authorizationHash: s.authorizationHash, status: 'matched' }
    }
    const age = horizon.tipHeight - s.anchorHeight
    return {
      authorizationHash: s.authorizationHash,
      status: age > horizon.horizonBlocks ? 'overdue' : 'pending',
    }
  })
}
