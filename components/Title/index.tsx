import React from 'react'
import css from './title.module.css'

const Title: React.FC = () => {
  return (
    <h1 className={css.title}>
      <span>rubén</span>
      <span>sospedra</span>
    </h1>
  )
}

export default Title
