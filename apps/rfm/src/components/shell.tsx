import type { ReactNode } from 'react'
import { Link } from 'react-router'

const Header = () => (
  <header className='flex flex-row justify-between w-full max-w-4xl p-4 mx-auto'>
    <Link to='/' className='font-mono text-xl font-bold text-black'>
      <span role='img' aria-label='construction'>
        🚧
      </span>{' '}
      rfm
    </Link>
    <Link
      to='/submit'
      className='px-2 py-1 text-pink-600 transition-[background-color,scale] duration-150 ease-out border border-pink-600 rounded hover:bg-pink-50 active:scale-[0.97]'
    >
      Submit new repo
    </Link>
  </header>
)

const Footer = () => (
  <footer className='flex flex-row justify-between w-full max-w-4xl p-4 mx-auto mt-4'>
    <p>
      Hand-crafted with
      <span className='mx-1 text-red-700' aria-label='heart' role='img'>
        ♥️
      </span>
      by
      <a
        className='ml-1 link'
        href='https://sospedra.me'
        rel='noopener noreferrer'
        target='_blank'
      >
        @sospedra
      </a>
    </p>

    <div className='flex flex-col items-end'>
      <Link className='text-blue-600 hover:text-blue-800' to='/about'>
        About
      </Link>
      <a
        href='https://twitter.com/sospedra_r'
        target='_blank'
        rel='noopener noreferrer'
        className='link'
      >
        Contact
      </a>
      <a
        href='https://github.com/sospedra/rfm'
        target='_blank'
        rel='noopener noreferrer'
        className='link'
      >
        Github
      </a>
    </div>
  </footer>
)

export const Shell = (props: { children: ReactNode }) => (
  <div className='flex flex-col min-h-screen'>
    <Header />
    <main className='grow w-full max-w-4xl p-4 mx-auto'>{props.children}</main>
    <Footer />
  </div>
)
