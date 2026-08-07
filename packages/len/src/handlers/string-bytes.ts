import { defineHandler, isString } from '../handler.ts'

const utf8 = new TextEncoder()

export const stringBytes = defineHandler(
  isString,
  (value) => utf8.encode(value).byteLength,
)
