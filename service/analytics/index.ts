declare global {
  interface Window {
    gtag: (type: string, id: string, option: Object) => void,
  }
}

export const GA_TRACKING_ID = 'UA-91771886-1'

export const pageview = (url: string): void => {
  window.gtag('config', GA_TRACKING_ID, {
    page_location: url
  })
}

type EventOptionsT = { [key: string]: string }

export const event: (options: EventOptionsT) => void = ({
  action,
  category,
  label,
  value,
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}
