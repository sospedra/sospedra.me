import { writeFileSync } from 'node:fs'
import { listStaticFiles, STATIC_ROOT } from '../../service/io/index.ts'

/* /console renders from this snapshot: tracing public/** into its
   revalidation function blew Vercel's 250mb limit (public is 533mb) */
writeFileSync(
  './service/io/static-files.json',
  `${JSON.stringify(listStaticFiles(STATIC_ROOT), null, 2)}\n`,
)
