import React from 'react'
import Emoji from 'components/Emoji'
import { useStack } from 'service/stack'

const Search: React.FC<{}> = () => {
  const { setSearch } = useStack()

  return (
    <section>
      <h2 className='pb-4 text-3xl font-bold'>
        Free form search
        <Emoji is='⤵' />
      </h2>
      <input
        onChange={(e) => setSearch(e.currentTarget.value)}
        placeholder='Type a name, tech, label, etc.'
        className='w-full font-serif text-2xl bg-transparent border-b border-dashed placeholder:text-cyan-900 md:text-3xl text-cyan-400 focus:outline-hidden'
      />
    </section>
  )
}

export default Search
