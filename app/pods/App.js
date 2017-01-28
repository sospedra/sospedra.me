import React from 'react'
import {
  BrowserRouter,
  Match,
  Miss
} from 'react-router'

import Appshell from 'pods/appshell'
import Home from 'pods/home'
import About from 'pods/about'
import Lost from 'pods/lost'

export default () => (
  <BrowserRouter>
    <Appshell>
      <Match exactly pattern='/' component={Home} />
      <Match pattern='/about' component={About} />
      <Miss component={Lost} />
    </Appshell>
  </BrowserRouter>
)
