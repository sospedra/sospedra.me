import { pathToRegexp } from 'path-to-regexp'

export const createPtr = (href: string) => {
  return (pattern: string) => {
    return pathToRegexp(pattern).exec(href) !== null
  }
}
