/* eslint-env jest */
import React from 'react'
import renderer from 'react-test-renderer'

import Home from './pages/index.js'

describe('Home', () => {
  it('shows titles and sprite', () => {
    const wrapper = renderer.create(<Home />)
    expect(wrapper.toJSON()).toMatchSnapshot()
  })
})
