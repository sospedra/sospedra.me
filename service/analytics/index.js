export const GA_TRACKING_ID = 'UA-91771886-1'

export const pageview = (url) => {
  return window.gtag('config', GA_TRACKING_ID, {
    page_location: url
  })
}

export const event = ({ action, category, label, value }) => {
  return window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}
