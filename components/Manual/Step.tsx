import React from 'react'
import css from './step.module.css'

const Step: React.FC<{ title: string; number: number }> = (props) => {
  const slug = `chapter-${props.number}`
  return (
    <div className={css.step}>
      <h2 id={slug} className={css.title}>
        <a href={`#${slug}`}>
          <span className={css.number}>{props.number}</span>
          {props.title}
        </a>
      </h2>
      {props.children}
    </div>
  )
}

export default Step
