import type React from 'react'
import css from './serve.module.css'

type TreeProps = {
  name: string
  children?: React.ReactNode
  controlsId?: string
  defaultOpen?: boolean
  route?: string
}

export const TreeParent: React.FC<TreeProps> = function TreeParent(props) {
  const controlsId = props.controlsId || 'serve-tree-branch'

  return (
    <details
      className={css.directory}
      data-node-name={props.name}
      open={props.defaultOpen}
    >
      <summary
        aria-controls={controlsId}
        className={css.summary}
        data-arrow-item=''
      >
        <span aria-hidden='true' className={css.directoryMark} />
        <span className={css.nodeName}>{props.name}</span>
        <span aria-hidden='true' className={css.nodeType}>
          DIR
        </span>
      </summary>

      <div className={css.branch} id={controlsId}>
        {props.children}
      </div>
    </details>
  )
}

export const TreeChild: React.FC<TreeProps> = function TreeChild(props) {
  return (
    <div className={css.file}>
      <a
        className={css.fileLink}
        data-arrow-item=''
        href={props.route?.replace('/public', '')}
        rel='noopener noreferrer'
        target='_blank'
      >
        <span aria-hidden='true' className={css.fileMark}>
          └
        </span>
        <span className={css.nodeName}>{props.name}</span>
        <span aria-hidden='true' className={css.openMark}>
          ↗
        </span>
      </a>
    </div>
  )
}
