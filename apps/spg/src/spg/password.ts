const MIN_PASSWORD_LENGTH = 8

export const getMaxLength = (sentences: string[]) =>
  sentences.reduce(
    (memo, { length }) => Math.max(memo, length),
    Number.MIN_SAFE_INTEGER,
  )

export const getMinLength = (inputLength: number) =>
  Math.max(inputLength, MIN_PASSWORD_LENGTH)

export const getLength = (inputLength: number, maxLength: number) =>
  Math.min(getMinLength(inputLength), maxLength)
