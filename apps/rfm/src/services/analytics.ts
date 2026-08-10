const MIXPANEL_TOKEN = 'e584fa40e066890465612b19042dddd1'

type Mixpanel = typeof import('mixpanel-browser')['default']

let client: Promise<Mixpanel | null> | null = null

export const createClient = (importer: () => Promise<{ default: Mixpanel }>) =>
  importer()
    .then((module) => {
      module.default.init(MIXPANEL_TOKEN)
      return module.default
    })
    .catch(() => null)

const load = () => {
  if (typeof window === 'undefined') return null
  client ??= createClient(() => import('mixpanel-browser'))
  return client
}

export const track = (event: string, payload?: Record<string, unknown>) => {
  load()?.then((mixpanel) => mixpanel?.track(event, payload))
}
