import React from 'react'
import { css } from 'aphrodite'

import styles from './styles'

export default (props) => (
  <div id='appshell' className={css(styles.appshell)}>
    {props.children}
  </div>
)
