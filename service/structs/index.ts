export function isNotNull<T>(it: T): it is NonNullable<T> {
  return it != null
}
