import ky, { type Options } from 'ky'

// biome-ignore lint/performance/noBarrelFile: the boundary owns its error vocabulary; consumers never import ky
export { HTTPError, TimeoutError } from 'ky'

/* The one fetch boundary: ten-second timeout, zero retries by default.
   Reads may opt into retry through options; writes never do. */
export const http = ky.create({ timeout: 10_000, retry: 0 })

type Schema<T> = { parse: (value: unknown) => T }

export const fetchJson = async <T>(
  url: string,
  schema: Schema<T>,
  options?: Options,
): Promise<T> => schema.parse(await http(url, options).json())
