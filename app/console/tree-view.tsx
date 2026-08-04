'use client'

import { useId, useState } from 'react'
import consoleOutput from './console-output.module.css'
import {
  buildFileTree,
  type FileTreeDirectory,
  type FileTreeFile,
  type FileTreeNode,
} from './tree'
import css from './tree-view.module.css'

type TreeViewProps = {
  paths: string[]
  segments: string[]
}

type TreeNodeProps = {
  node: FileTreeNode
}

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg className={css.treeIcon} viewBox='0 0 24 24' aria-hidden='true'>
    {open ? (
      <path d='M3 8h18l-2.2 10H5.2L3 8Zm0 0V5h6l2 3' />
    ) : (
      <path d='M3 6h6l2 2h10v10H3V6Z' />
    )}
  </svg>
)

const FileIcon = () => (
  <svg className={css.treeIcon} viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M6 3h8l4 4v14H6V3Zm8 0v5h4' />
  </svg>
)

function FileNode({ node }: { node: FileTreeFile }) {
  return (
    <li className={css.treeItem}>
      <a
        className={`${css.treeRow} ${css.treeFileRow}`}
        href={node.path}
        target='_blank'
        rel='noreferrer'
      >
        <FileIcon />
        <span className={css.treeName}>{node.name}</span>
      </a>
    </li>
  )
}

function DirectoryNode({ node }: { node: FileTreeDirectory }) {
  const controlsId = useId()
  const [open, setOpen] = useState(false)
  const [visited, setVisited] = useState(false)

  const toggle = () => {
    if (!open) setVisited(true)
    setOpen((current) => !current)
  }

  return (
    <li className={css.treeItem}>
      <button
        type='button'
        className={`${css.treeRow} ${css.treeFolderRow}`}
        aria-expanded={open}
        aria-controls={controlsId}
        onClick={toggle}
      >
        <FolderIcon open={open} />
        <span className={css.treeName}>{node.name}</span>
        <span className={css.treeCount} aria-hidden='true'>
          {node.fileCount}
        </span>
      </button>
      <div
        id={controlsId}
        className={css.treeChildrenShell}
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={css.treeChildrenClip}>
          {visited && <TreeNodes nodes={node.children} />}
        </div>
      </div>
    </li>
  )
}

function TreeNode({ node }: TreeNodeProps) {
  return node.kind === 'directory' ? (
    <DirectoryNode node={node} />
  ) : (
    <FileNode node={node} />
  )
}

function TreeNodes({ nodes }: { nodes: FileTreeNode[] }) {
  return (
    <ul className={css.treeList}>
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </ul>
  )
}

export default function TreeView({ paths, segments }: TreeViewProps) {
  const tree = buildFileTree(paths, segments)
  const drivePath = tree.path === '/' ? 'S:/' : `S:${tree.path}`

  return (
    <section
      className={css.treePanel}
      aria-label={`File tree for ${drivePath}`}
      aria-live='off'
    >
      <p className='sr-only'>
        {tree.directoryCount} directories and {tree.fileCount} files. Folder
        buttons expand and collapse their contents.
      </p>
      <div className={css.treeHeader} aria-hidden='true'>
        <span>TREE INDEX</span>
        <span>{String(tree.fileCount).padStart(4, '0')} FILES</span>
      </div>
      <div className={`${css.treeRow} ${css.treeRootRow}`}>
        <FolderIcon open />
        <span className={css.treeName}>{drivePath}</span>
      </div>
      {tree.children.length ? (
        <div className={css.treeRootBranches}>
          <TreeNodes nodes={tree.children} />
        </div>
      ) : (
        <p className={`${consoleOutput.line} ${consoleOutput.dim}`}>
          Directory is empty
        </p>
      )}
      <p className={css.treeFooter}>
        {tree.directoryCount} dir(s) · {tree.fileCount} file(s)
      </p>
    </section>
  )
}
