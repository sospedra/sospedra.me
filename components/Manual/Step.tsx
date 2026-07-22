import type React from 'react'
import css from './step.module.css'

const Step: React.FC<{
  title: string
  number?: number
  children: React.ReactNode
}> = (props) => {
  if (props.number === undefined) {
    return (
      <article className={css.step}>
        <h2 className={css.title}>{props.title}</h2>
        {props.children}
      </article>
    )
  }

  const slug = `chapter-${props.number}`
  return (
    <article className={css.step}>
      <h2 id={slug} className={css.title}>
        <a href={`#${slug}`}>
          <span className={css.number}>{props.number}</span>
          {props.title}
        </a>
      </h2>
      {props.children}
    </article>
  )
}

export default Step
