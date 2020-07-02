import React from 'react'
import { StackProvider } from 'service/stack'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import Featured from 'components/Stack/Featured'
import CategoryList from 'components/Stack/Category'
import TechList from 'components/Stack/Tech'
import Search from 'components/Stack/Search'

const description = `A curated list of the best high-quality up-to-date technologies of ${new Date().getUTCFullYear()}`

const Stack: React.FC<{}> = () => {
  return (
    <Shell
      title='Stack'
      className='relative w-full h-full max-w-4xl px-4 pt-12 pb-20 mx-auto text-white'
      description={description}
      canonical='/stack'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>
      <h1 className='text-3xl md:text-4xl'>My hand-picked stack</h1>
      <p className='pb-10'>{description}</p>

      <StackProvider>
        <Search />
        <Featured />
        <CategoryList />
        <TechList />
      </StackProvider>
    </Shell>
  )
}

export default Stack
