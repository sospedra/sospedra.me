import { defineHandler } from '../handler.ts'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export const objectKeys = defineHandler(isPlainObject, (value) => {
  return Object.keys(value).length
})
