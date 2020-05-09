import React from 'react'
import css from './title.module.css'

const Title: React.FC<{}> = () => {
  return (
    <h1 className={css.title}>
      <span>Rubén</span>
      <span>Sospedra</span>
    </h1>
  )
}

export default Title
