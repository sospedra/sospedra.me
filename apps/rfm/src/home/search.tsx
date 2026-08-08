import { Link } from 'react-router'
import { Info } from '../components/icons.tsx'

export const Search = (props: { setQuery: (query: string) => void }) => {
  return (
    <section className='flex flex-col items-center justify-center w-full text-center md:p-8'>
      <h2 className='italic text-blue-600 whitespace-nowrap hover:text-blue-800'>
        <Link to='/about'>
          Track OSS requests for maintainers <Info />
        </Link>
      </h2>
      <form
        className='w-full max-w-xl mx-auto'
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          props.setQuery(String(form.get('search') ?? ''))
        }}
      >
        <label htmlFor='search' className='block'>
          <h1 className='font-mono text-xl font-bold'>
            Browse repos that need support
          </h1>
        </label>
        <div className='flex flex-row my-4'>
          <input
            id='search'
            name='search'
            className='block w-full px-4 py-2 border rounded shadow-lg'
            placeholder='Type a name, language, tag, etc.'
          />
          <input
            className='px-4 py-2 ml-4 text-white transition-[background-color,scale] duration-150 ease-out bg-pink-600 rounded shadow-lg cursor-pointer hover:bg-pink-700 active:scale-[0.97]'
            type='submit'
            value='Search'
          />
        </div>
      </form>
    </section>
  )
}
