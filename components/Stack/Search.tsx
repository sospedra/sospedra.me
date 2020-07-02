import React from 'react'

const Search: React.FC<{}> = () => {
  return (
    <div>
      <input
        placeholder='Type a name, tech, label, etc.'
        className='w-full font-serif text-2xl font-bold bg-transparent md:text-3xl text-cyan-400 focus:outline-none'
      />
    </div>
  )
}

export default Search
