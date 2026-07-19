import { useContext, useState } from 'react'
import Fuse from 'fuse.js'
import debounce from 'lodash.debounce'
import context, { defaultState } from './context'

const { stack, anchor } = defaultState
const fuse = new Fuse(stack, {
  keys: ['name', 'tags', 'categories'],
})

const searchFilter = debounce(
  (search: string, setResults: (results: typeof stack) => void) => {
    if (!search) {
      setResults(stack)
    } else {
      setResults(fuse.search(search).map(({ item }) => item))
    }
  },
  400,
  { leading: true },
)

const filterByCategory = (category: string) => {
  if (category === 'all') return stack
  return stack.filter((tech) => tech.categories.includes(category))
}

export const useStack = () => {
  return useContext(context)
}

export const StackProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const [results, setResults] = useState(stack)
  const [category, setCategoryState] = useState('all')
  const [search, setSearchState] = useState('')
  const filter = (clbk: (result: (typeof results)[0]) => boolean) => {
    setResults(stack.filter(clbk))
  }
  const reset = () => {
    setResults([])
    setCategoryState('all')
  }
  const setCategory = (next: string) => {
    setCategoryState(next)
    setResults(filterByCategory(next))
  }
  const setSearch = (next: string) => {
    setSearchState(next)
    searchFilter(next, setResults)
  }
  const scrollTo = () => {
    document
      .querySelector('#vbody')
      ?.scrollTo(0, anchor.current?.offsetTop || 0)
  }

  return (
    <context.Provider
      value={{
        ...defaultState,
        results,
        filter,
        category,
        setCategory,
        reset,
        search,
        setSearch,
        scrollTo,
      }}
    >
      {props.children}
    </context.Provider>
  )
}
