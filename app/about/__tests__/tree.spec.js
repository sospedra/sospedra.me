/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import About from '../index'

describe('About wrapper suite', () => {
  const wrapper = shallow(<About />)

  it('should have a text with the pod name', () => {
    expect(wrapper.find('p').text()).toBe('About')
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
