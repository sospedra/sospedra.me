import { join } from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..'),
  reactStrictMode: true,
  typedRoutes: true,
}

export default config
