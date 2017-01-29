/* global describe, expect, it */
import React from 'react'
import { shallow } from 'enzyme'

import Appshell from '../index'

describe('Appshell wrapper suite', () => {
  const wrapper = shallow(<Appshell>
    <div>A</div>
    <div>B</div>
  </Appshell>)

  it('should have as many children as sent by props', () => {
    expect(wrapper.children().length).toBe(2)
  })

  it('should match the snapshot', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
