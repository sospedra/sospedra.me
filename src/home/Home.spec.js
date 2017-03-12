/* global it */
import Inferno, { render } from 'inferno'

import Home from './Home'

it('renders without crashing', () => {
  const div = document.createElement('div')
  render(<Home />, div)
})
