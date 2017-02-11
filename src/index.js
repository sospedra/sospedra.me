import Inferno from 'inferno'
import { createBrowserHistory } from 'history'
import {
  Router,
  Route,
  IndexRoute
} from 'inferno-router'

import Home from './home/Home'
import About from './about/About'
import './index.css'

const browserHistory = createBrowserHistory()

const App = () => (
  <Router history={browserHistory}>
    <IndexRoute component={Home} />
    <Route path='/about' component={About} />
  </Router>
)

Inferno.render(<App />, document.getElementById('sospedra'))
