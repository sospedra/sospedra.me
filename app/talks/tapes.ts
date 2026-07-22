export type Tape = {
  id: string
  src: string
  title: string
  venue: string
  lang: 'EN' | 'ES'
  slides?: string
}

export const TAPES: Tape[] = [
  {
    id: 'fsm-jsconf-budapest',
    src: '/talks/finite-state-machines/jsconf-budapest.mp4',
    title: 'Mastering views with finite state machines',
    venue: 'JSConf Budapest',
    lang: 'EN',
    slides: '/talks/finite-state-machines/slides.pdf',
  },
  {
    id: 'fsm-jskongress',
    src: '/talks/finite-state-machines/jskongress.mp4',
    title: 'Mastering views with finite state machines',
    venue: 'JS Kongress',
    lang: 'EN',
    slides: '/talks/finite-state-machines/slides.pdf',
  },
  {
    id: 'fsm-jsday-spain',
    src: '/talks/finite-state-machines/jsday-spain.mp4',
    title: 'Mastering views with finite state machines',
    venue: 'JSDay Spain',
    lang: 'ES',
    slides: '/talks/finite-state-machines/slides.pdf',
  },
  {
    id: 'frp-workshop',
    src: '/talks/functional-programming/frp-workshop.mp4',
    title: 'Intro to functional programming',
    venue: 'FRP workshop',
    lang: 'ES',
    slides: '/talks/functional-programming/slides.pdf',
  },
  {
    id: 'rn-nine-circles',
    src: '/talks/rn-9-circles-of-hell/react-native-meetup.mp4',
    title: 'React Native and the 9 circles of hell',
    venue: 'React Native meetup',
    lang: 'EN',
    slides: '/talks/rn-9-circles-of-hell/slides.pdf',
  },
]
