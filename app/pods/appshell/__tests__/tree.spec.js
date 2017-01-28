/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import Appshell from '../index'

describe('Appshell wrapper suite', () => {
  const wrapper = shallow(<Appshell />)

  it('should have a text with the pod name', () => {
    expect(wrapper.find('p').text()).toBe('Appshell')
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
