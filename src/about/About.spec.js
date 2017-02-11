/* global it */
import Inferno, { render } from 'inferno'
import About from './About'

it('renders without crashing', () => {
  const div = document.createElement('div')
  render(<About />, div)
})
