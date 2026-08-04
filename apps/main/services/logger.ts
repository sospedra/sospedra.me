type LogProps = Record<string, unknown>

/* The one console home. App code logs through a named scope, never through
   console.* directly. The easteregg console art is the sanctioned exception:
   the console IS its output surface. */
export const createLogger = (scope: string) => ({
  warn(message: string, props?: LogProps) {
    if (props) console.warn(`[${scope}] ${message}`, props)
    else console.warn(`[${scope}] ${message}`)
  },
  error(message: string, props?: LogProps) {
    if (props) console.error(`[${scope}] ${message}`, props)
    else console.error(`[${scope}] ${message}`)
  },
})
