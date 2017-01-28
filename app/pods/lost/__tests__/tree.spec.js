/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import Lost from '../index'

describe('Lost wrapper suite', () => {
  const wrapper = shallow(<Lost />)

  it('should have a text with the pod name', () => {
    expect(wrapper.find('p').text()).toBe('Lost')
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
