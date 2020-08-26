import React from 'react'
import css from './step.module.css'

const Step: React.FC<{ title: string; number: number }> = (props) => {
  return (
    <div className={css.step}>
      <h2 className={css.title}>
        <span className={css.number}>{props.number}</span>
        {props.title}
      </h2>
      {props.children}
    </div>
  )
}

export default Step
