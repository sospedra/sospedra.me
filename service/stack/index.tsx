import { useContext, useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import debounce from 'lodash.debounce'
import context, { defaultState } from './context'

const { stack } = defaultState
const fuse = new Fuse(stack, {
  keys: ['name', 'title', 'description', 'tags', 'categories'],
})

export const useStack = () => {
  return useContext(context)
}

export const StackProvider: React.FC<{}> = (props) => {
  const [results, setResults] = useState(stack)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const filter = (clbk: (result: typeof results[0]) => boolean) => {
    setResults(stack.filter(clbk))
  }
  const reset = () => {
    setResults([])
    setCategory('all')
  }

  useEffect(() => {
    if (category === 'all') {
      setResults(stack)
    } else {
      setResults(
        stack.filter((tech) => {
          return tech.categories.includes(category)
        }),
      )
    }
  }, [category])

  useEffect(() => {
    if (!search) {
      setResults(stack)
    } else {
      setResults(fuse.search(search).map(({ item }) => item))
    }
  }, [search])

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
        setSearch: debounce(setSearch),
      }}
    >
      {props.children}
    </context.Provider>
  )
}
