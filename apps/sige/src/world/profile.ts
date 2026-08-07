// The invariant: only an external authority with mandatory public records
// can trigger an unseal. A profile is pure data; widening one is a policy event.
export type AuthorityProfile = {
  id: string
  title: string
  roles: string[]
  acceptedRoles: string[]
  legalBasisCode: string
  recordHorizonBlocks: number // mandatory-publication deadline, in sim blocks
}

export const GENERIC: AuthorityProfile = {
  id: 'generic',
  title: 'Generic authority',
  roles: ['court', 'oversight', 'agency'],
  acceptedRoles: ['court', 'oversight'],
  legalBasisCode: 'generic/lawful-access/v1',
  recordHorizonBlocks: 12,
}

// Worked example: LECrim 588 ter m / e-Evidence art. 4 as pluggable data.
export const ES: AuthorityProfile = {
  id: 'es',
  title: 'Spain (worked example)',
  roles: ['judge', 'prosecutor', 'police'],
  acceptedRoles: ['judge', 'prosecutor'],
  legalBasisCode: 'LECrim-588-ter-m',
  recordHorizonBlocks: 12,
}

export const PROFILES: Record<string, AuthorityProfile> = {
  [GENERIC.id]: GENERIC,
  [ES.id]: ES,
}
