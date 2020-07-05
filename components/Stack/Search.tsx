import React from 'react'
import Emoji from 'components/Emoji'
import { useStack } from 'service/stack'

const Search: React.FC<{}> = () => {
  const { setSearch, search } = useStack()

  return (
    <section>
      <h2 className='pb-4 font-serif text-3xl'>
        Free form search
        <Emoji is='⤵' />
      </h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        placeholder='Type a name, tech, label, etc.'
        className='w-full font-serif text-2xl bg-transparent placeholder-cyan-900 md:text-3xl text-cyan-400 focus:outline-none'
      />
    </section>
  )
}

export default Search
