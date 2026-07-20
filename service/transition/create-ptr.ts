// ':param' segments match any single segment, e.g. '/papers/:slug'
export const createPtr = (href: string) => {
  const segments = href.split('/')

  return (pattern: string) => {
    const parts = pattern.split('/')
    if (parts.length !== segments.length) return false
    return parts.every((part, index) => {
      return part.startsWith(':') || part === segments[index]
    })
  }
}
