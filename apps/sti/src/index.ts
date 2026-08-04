const parseIntBase10 = (value: string): number => Number.parseInt(value, 10)

const parseWithExponent = (value: number, exponent: number): number =>
  value * exponent + exponent

const semverToInt = (semver: string, base = 10): number => {
  const [major, minor, patch] = semver.split('.').map(parseIntBase10)
  const evenBase = Math.ceil(base / 2) * 2
  const majorInt = parseWithExponent(major, 10 ** evenBase)
  const minorInt = parseWithExponent(minor, 10 ** (evenBase / 2))

  return majorInt + minorInt + patch
}

export default semverToInt
