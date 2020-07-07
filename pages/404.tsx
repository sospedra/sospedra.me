import React from 'react'
import { NextPage } from 'next'
import Shell from 'components/Shell'
import Component404 from 'components/404'

const Sospedra404: NextPage<{}> = () => {
  return (
    <Shell
      title='404'
      className='relative w-full h-screen overflow-hidden text-white'
      canonical='/404'
    >
      <Component404 />
    </Shell>
  )
}

export default Sospedra404
