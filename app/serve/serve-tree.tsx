import { TreeChild, TreeParent } from 'components/Serve'
import TreeController from 'components/Serve/tree-controller'
import type { TreeNode } from 'service/io'

const renderTree = (subtree: TreeNode[], prefix = '0') => {
  return subtree.map((node, index) => {
    const branchId = `serve-branch-${prefix}-${index}`
    const children = node.children.length
      ? renderTree(node.children, `${prefix}-${index}`)
      : undefined
    const TreeComponent = children ? TreeParent : TreeChild

    return (
      <TreeComponent
        controlsId={branchId}
        name={node.name || '/'}
        key={branchId}
        defaultOpen={['', 'public'].includes(node.name)}
        route={node.path}
      >
        {children}
      </TreeComponent>
    )
  })
}

export default function ServeTree(props: { tree: TreeNode[] }) {
  return <TreeController>{renderTree(props.tree)}</TreeController>
}
