import { createLen } from './create-len.ts'
import type { FallbackMode } from './fallback.ts'
import { defineHandler, type Handler } from './handler.ts'
import type { Lenable } from './measure.ts'

const len: (target: Lenable) => number = /* @__PURE__ */ createLen()

export type { FallbackMode, Handler, Lenable }
export { createLen, defineHandler }
export default len
