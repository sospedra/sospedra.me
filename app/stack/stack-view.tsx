'use client'

import { StackProvider } from 'service/stack'
import Featured from 'components/Stack/Featured'
import CategoryList from 'components/Stack/Category'
import TechList from 'components/Stack/Tech'
import Search from 'components/Stack/Search'

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
