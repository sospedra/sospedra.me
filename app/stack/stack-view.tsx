'use client'

import CategoryList from 'components/Stack/Category'
import Featured from 'components/Stack/Featured'
import Search from 'components/Stack/Search'
import TechList from 'components/Stack/Tech'
import { StackProvider } from 'service/stack'

export default function StackView() {
  return (
    <StackProvider>
      <Search />
      <Featured />
      <CategoryList />
      <TechList />
    </StackProvider>
  )
}
