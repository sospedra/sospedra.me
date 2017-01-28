/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import Home from '../index'

describe('Home wrapper suite', () => {
  const wrapper = shallow(<Home />)

  it('should have a text with the pod name', () => {
    expect(wrapper.find('p').text()).toBe('Home')
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
