import { sha256 } from '@noble/hashes/sha2.js'
import { ascii, concat, u64be } from './bytes.ts'

export class Prng {
  private label: string
  private counter: number

  constructor(label: string) {
    this.label = label
    this.counter = 0
  }

  bytes(n: number): Uint8Array {
    const seed = sha256(ascii(`vouch-seed:${this.label}`))
    const result = new Uint8Array(n)
    let filled = 0

    while (filled < n) {
      const block = sha256(concat(seed, u64be(BigInt(this.counter))))
      const remaining = n - filled
      const toCopy = Math.min(block.length, remaining)
      result.set(block.slice(0, toCopy), filled)
      filled += toCopy
      this.counter += 1
    }

    return result
  }
}
