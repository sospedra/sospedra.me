export default function len(target: unknown): number {
  return Array.isArray(target) ? target.length : 0
}
