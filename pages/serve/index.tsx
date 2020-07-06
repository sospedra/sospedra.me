import React from 'react'
import { NextPage } from 'next'
import { getStaticFiles, pathsToTree, TreeNode } from 'service/io'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import { TreeParent, TreeChild } from 'components/Serve'

const description = 'List of all the public-available static assets'

const Serve: NextPage<{
  tree: TreeNode[]
  paths: string[]
}> = (props) => (
  <Shell
    title='Serve'
    className='relative w-full h-full max-w-xl px-4 pt-12 pb-20 mx-auto text-white'
    description={description}
    canonical='/static'
  >
    <Link url='/'>
      <LinkBack>Home</LinkBack>
    </Link>

    <h1 className='pt-8 text-4xl'>Serve assets</h1>
    <p className='pb-10'>{description}</p>

    <div className='pb-20'>{renderTree(props.tree, props.paths)}</div>
  </Shell>
)

const renderTree = (subtree: TreeNode[], paths: string[]) => {
  return subtree.map((node) => {
    const children = node.children.length
      ? renderTree(node.children, paths)
      : undefined
    const TreeComponent = !!children ? TreeParent : TreeChild

    return (
      <TreeComponent
        name={node.name || '/'}
        key={node.name}
        defaultOpen={['', 'public'].includes(node.name)}
        children={children}
        route={paths.find((path) => {
          return path.split('/').pop() === node.name
        })}
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
    props: { tree, paths },
  }
}

export default Serve
