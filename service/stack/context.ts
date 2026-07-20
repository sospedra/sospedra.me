import { countBy } from 'es-toolkit'
import { createContext, createRef } from 'react'
import stack from './stack.json'

export const defaultState = {
  stack,
  categories: countBy(
    stack.flatMap((tech) => tech.categories),
    (category) => category,
  ),
  results: [] as (typeof stack)[0][],
  category: 'all',
  setCategory: (() => {}) as (category: string) => void,
  setSearch: (() => {}) as (search: string) => void,
  search: '',
  filter: (() => {}) as (clbk: (result: (typeof stack)[0]) => boolean) => void,
  reset: () => {},
  scrollTo: () => {},
  anchor: createRef<HTMLDivElement>(),
}

export default createContext(defaultState)
