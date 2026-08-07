import { defineHandler, isString } from '../handler.ts'

export const stringCodeUnits = defineHandler(isString, (value) => value.length)
