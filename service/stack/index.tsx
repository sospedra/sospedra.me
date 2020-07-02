import { useContext, useState, useEffect } from 'react'
import context, { defaultState, State } from './context'

export const useStack = () => {
  return useContext(context)
}

export const StackProvider: React.FC<{}> = (props) => {
  const [results, filter] = useState<State['results']>([])
  const [category, setCategory] = useState('all')

  useEffect(() => {
    if (category === 'all') {
      filter(defaultState.stack)
    } else {
      filter(
        defaultState.stack.filter((tech) => {
          return tech.categories.includes(category)
        }),
      )
    }
  }, [category])

  return (
    <context.Provider
      value={{ ...defaultState, results, filter, category, setCategory }}
    >
      {props.children}
    </context.Provider>
  )
}
