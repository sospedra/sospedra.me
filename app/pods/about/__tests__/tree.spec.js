/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import Home from '../index'

describe('Home wrapper suite', () => {
  const wrapper = shallow(<Home />)

  it('should have 2 links', () => {
    expect(wrapper.find('a').length).toBe(2)
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
