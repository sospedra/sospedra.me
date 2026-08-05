'use client'

import { createExternalStore } from 'services/external-store'
import { type DecorDoc, INITIAL_DECOR } from './decor'

/* the live document; only editor sessions ever write it */
export const decorStore = createExternalStore<DecorDoc>(INITIAL_DECOR)

/* editor stage simulation width in px; null = native viewport */
export const stageSimStore = createExternalStore<number | null>(null)
