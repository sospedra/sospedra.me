/* eslint-env jest */
import * as analytics from './index'

describe('service analytics', () => {
  it('submits an event pageView with the page_location', () => {
    const route = 'http://some.route'
    window.gtag = jest.fn()

    analytics.pageview(route)
    expect(window.gtag).toHaveBeenCalledWith(
      'config',
      analytics.GA_TRACKING_ID,
      { page_location: route }
    )
  })

  it('submits a categorized event', () => {
    const action = 'action'
    const category = 'category'
    const label = 'label'
    const value = 'value'
    window.gtag = jest.fn()

    analytics.event({ action, category, label, value })
    expect(window.gtag).toHaveBeenCalledWith('event', action, {
      event_category: category,
      event_label: label,
      value: value
    })
  })
})
