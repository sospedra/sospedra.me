import type React from 'react'
import css from './postmortem.module.css'

const Postmortem: React.FC<{
  error: React.ReactNode
  insight: React.ReactNode
  fix: React.ReactNode
}> = (props) => (
  <dl className={css.postmortem}>
    <div className={css.row} data-kind='error'>
      <dt className={css.kind}>error</dt>
      <dd className={css.body}>{props.error}</dd>
    </div>
    <div className={css.row} data-kind='insight'>
      <dt className={css.kind}>insight</dt>
      <dd className={css.body}>{props.insight}</dd>
    </div>
    <div className={css.row} data-kind='fix'>
      <dt className={css.kind}>fix</dt>
      <dd className={css.body}>{props.fix}</dd>
    </div>
  </dl>
)

export default Postmortem
