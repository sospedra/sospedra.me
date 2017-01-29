import ReactDOM from 'react-dom'
import React from 'react'
import {
  BrowserRouter,
  Match,
  Miss
} from 'react-router'

import Appshell from 'appshell'
import Home from 'home'
import About from 'about'
import Lost from 'lost'

export const App = () => (
  <BrowserRouter>
    <Appshell>
      <Match exactly pattern='/' component={Home} />
      <Match pattern='/about' component={About} />
      <Miss component={Lost} />
    </Appshell>
  </BrowserRouter>
)

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.querySelector('#app'))
})
