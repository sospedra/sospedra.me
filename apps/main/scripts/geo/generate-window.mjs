#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

/* Prebuild window: ISR revalidation picks the newest published edition at
   runtime, so every deploy must carry days ahead. Fourteen days survives a
   two-week deploy drought before the daily goes stale. */
const WINDOW_DAYS = 14

const start = Date.now()
for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
  const date = new Date(start + offset * 86_400_000).toISOString().slice(0, 10)
  execFileSync('node', ['scripts/geo/generate-challenge.ts', date], {
    stdio: 'inherit',
  })
}
