import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // prose-heavy personal site: apostrophes in jsx text stay literal
      'react/no-unescaped-entities': 'off',
      // false-positives on ref={refs[i]} with a hook-returned RefObject tuple
      'react-hooks/refs': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'next-env.d.ts',
    'internals/**',
    '.lintstagedrc.js',
  ]),
])
