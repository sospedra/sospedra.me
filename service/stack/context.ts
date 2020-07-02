import { Dispatch, SetStateAction, createContext } from 'react'
import stack from './stack.json'

export const defaultState = {
  stack,
  categories: stack.reduce<{ [category: string]: number }>((memo, tech) => {
    const patch = { ...memo }
    tech.categories.forEach((category) => {
      const current = patch[category]
      patch[category] = current ? current + 1 : 1
    })
    return patch
  }, {}),
  results: [] as typeof stack[0][],
  category: 'all',
  setCategory: (() => {}) as Dispatch<SetStateAction<string>>,
  filter: (() => {}) as Dispatch<SetStateAction<typeof stack[0][]>>,
}

// const tags = [...new Set(stack.map((x) => x.tags).flat())]

export type State = typeof defaultState

export default createContext(defaultState)
