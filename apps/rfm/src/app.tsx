import { animated, useTransition } from '@react-spring/web'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { About } from './about/about.tsx'
import { Confirm } from './confirm/confirm.tsx'
import { Home } from './home/home.tsx'
import { track } from './services/analytics.ts'
import { Submit } from './submit/submit.tsx'

export const App = () => {
  const location = useLocation()
  const transitions = useTransition(location, {
    keys: (item) => item.pathname,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  })

  useEffect(() => {
    track('pview', { route: location.pathname })
  }, [location])

  return transitions((style, item) => (
    <animated.div style={style}>
      <Routes location={item}>
        <Route path='/' element={<Home />} />
        <Route path='/submit' element={<Submit />} />
        <Route path='/confirm' element={<Confirm />} />
        <Route path='/about' element={<About />} />
      </Routes>
    </animated.div>
  ))
}
