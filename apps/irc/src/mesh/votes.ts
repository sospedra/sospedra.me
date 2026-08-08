export const majorityOf = (memberCount: number): number =>
  Math.floor(memberCount / 2) + 1

export class KickTally {
  private readonly votes = new Map<string, Map<string, number>>()
  private readonly windowMs: number

  constructor(windowMs: number) {
    this.windowMs = windowMs
  }

  add(voterHex: string, targetHex: string, nowMs: number): number {
    const forTarget = this.votes.get(targetHex) ?? new Map<string, number>()
    forTarget.set(voterHex, nowMs + this.windowMs)
    this.votes.set(targetHex, forTarget)
    return this.tally(targetHex, nowMs)
  }

  tally(targetHex: string, nowMs: number): number {
    const forTarget = this.votes.get(targetHex)
    if (forTarget === undefined) return 0
    return [...forTarget.values()].filter((expiry) => expiry > nowMs).length
  }

  prune(nowMs: number): void {
    for (const [target, voters] of this.votes) {
      for (const [voter, expiry] of voters) {
        if (expiry <= nowMs) voters.delete(voter)
      }
      if (voters.size === 0) this.votes.delete(target)
    }
  }

  clear(targetHex: string): void {
    this.votes.delete(targetHex)
  }
}
