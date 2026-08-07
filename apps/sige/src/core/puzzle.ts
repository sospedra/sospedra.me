import { bytesToBigInt, randomBytes } from './bytes.ts'

// Modular exponentiation and prime generation for LHTLP (lhtlp.ts).

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Miller-Rabin primality test
function isProbablePrime(n: bigint, rounds = 12): boolean {
  if (n < 2n) return false
  for (const p of SMALL_PRIMES) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let d = n - 1n
  let r = 0n
  while ((d & 1n) === 0n) {
    d >>= 1n
    r++
  }
  for (let i = 0; i < rounds; i++) {
    const a = 2n + (bytesToBigInt(randomBytes(16)) % (n - 3n))
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    let witness = true
    for (let j = 1n; j < r; j++) {
      x = (x * x) % n
      if (x === n - 1n) {
        witness = false
        break
      }
    }
    if (witness) return false
  }
  return true
}

export function randomPrime(bits: number): bigint {
  for (;;) {
    let c = bytesToBigInt(randomBytes(bits / 8))
    c |= 1n | (1n << BigInt(bits - 1))
    if (isProbablePrime(c)) return c
  }
}
