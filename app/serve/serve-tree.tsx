'use client'

import { useSearchParams } from 'next/navigation'
import type { TreeNode } from 'service/io'
import { TreeParent, TreeChild } from 'components/Serve'

const renderTree = (subtree: TreeNode[], expand?: string[]) => {
  return subtree.map((node) => {
    const children = node.children.length
      ? renderTree(node.children, expand)
      : undefined
    const TreeComponent = children ? TreeParent : TreeChild

    return (
      <TreeComponent
        name={node.name || '/'}
        key={node.name}
        defaultOpen={['', 'public', ...(expand || [])].includes(node.name)}
        bold={!!expand?.includes(node.name)}
        route={node.path}
      >
        {children}
      </TreeComponent>
    )
  })
}

export default function ServeTree(props: { tree: TreeNode[] }) {
  const searchParams = useSearchParams()
  const expand = searchParams?.get('e')?.split('.')

  return <>{renderTree(props.tree, expand)}</>
}
