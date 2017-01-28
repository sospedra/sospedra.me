import React from 'react'
import { StyleSheet, css } from 'aphrodite'

const styles = StyleSheet.create({
  link: {
    color: 'cadetblue'
  }
})

export default class App extends React.Component {
  render () {
    return (
      <div id='content'>
        <h1>&nbsp;</h1>
        <h2>Welcome!</h2>
        <ul>
          <li className={css(styles.link)}>
            <a href='http://brunch.io'>Brunch homepage</a>
          </li>
          <li className={css(styles.link)}>
            <a href='https://facebook.github.io/react/'>React.js homepage</a>
          </li>
        </ul>
      </div>
    )
  }
}
