import { defineHandler, isString } from '../handler.ts'

export const stringCodePoints = defineHandler(
  isString,
  (value) => [...value].length,
)
