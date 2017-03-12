import Inferno from 'inferno'
import { createBrowserHistory } from 'history'
import {
  Router,
  IndexRoute
} from 'inferno-router'

import Home from './home/Home'
import './index.css'

const browserHistory = createBrowserHistory()

const App = () => (
  <Router history={browserHistory}>
    <IndexRoute component={Home} />
  </Router>
)

Inferno.render(<App />, document.getElementById('sospedra'))
