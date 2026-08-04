import { join } from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..'),
  pageExtensions: ['ts', 'tsx'],
  reactCompiler: true,
}

export default config
