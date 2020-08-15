import React from 'react'
import { NextPage } from 'next'
import { getStaticFiles, pathsToTree, TreeNode } from 'service/io'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import { TreeParent, TreeChild } from 'components/Serve'
import { useRouter } from 'next/router'

export const SERVE_DESC = 'List of all the public-available static assets'

const Serve: NextPage<{
  tree: TreeNode[]
}> = (props) => {
  const router = useRouter()
  const expand = router.query.e?.toString().split('.')

  return (
    <Shell
      title='Serve'
      className='relative w-full h-full max-w-xl px-4 pt-12 pb-20 mx-auto text-white'
      description={SERVE_DESC}
      canonical='/static'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <h1 className='pt-8 text-4xl'>Serve assets</h1>
      <p className='pb-10'>{SERVE_DESC}</p>

      <div className='pb-20'>{renderTree(props.tree, expand)}</div>
    </Shell>
  )
}

const renderTree = (subtree: TreeNode[], expand?: string[]) => {
  return subtree.map((node) => {
    const children = node.children.length
      ? renderTree(node.children, expand)
      : undefined
    const TreeComponent = !!children ? TreeParent : TreeChild

    return (
      <TreeComponent
        name={node.name || '/'}
        key={node.name}
        defaultOpen={['', 'public', ...(expand || [])].includes(node.name)}
        bold={!!expand?.includes(node.name)}
        children={children}
        route={node.path}
      />
    )
  })
}

export async function getStaticProps() {
  const paths = []
  for await (const file of getStaticFiles('public')) {
    paths.push(file)
  }
  const tree = pathsToTree(paths.map((p) => p.split('/')))

  return {
    props: { tree },
  }
}

export default Serve
