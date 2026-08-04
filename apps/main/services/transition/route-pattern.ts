// ':param' segments match any single segment, e.g. '/papers/:slug'
export const matchRoutePattern = (href: string, pattern: string) => {
  const segments = href.split('/')
  const parts = pattern.split('/')
  if (parts.length !== segments.length) return false
  return parts.every((part, index) => {
    return part.startsWith(':') || part === segments[index]
  })
}
