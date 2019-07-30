const noop = () => { }

const vault = {
  exec: noop,
  hasBeenStarted: false,
}

const reset = () => {
  vault.exec = noop
  vault.hasBeenStarted = false
}

export const onFinish = () => {
  if (vault.hasBeenStarted) {
    vault.exec()
    reset()
  }
}

export const registerOnFinish = (onFinish) => {
  vault.exec = onFinish
}

export const start = () => {
  vault.hasBeenStarted = true
}