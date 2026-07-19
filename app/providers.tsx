'use client'

import { ThemeProvider } from 'service/theme'
import { Provider as TransitionProvider } from 'service/transition'
import { Mousetrap } from 'service/mousetrap'
import EasterEgg from 'service/easteregg'

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TransitionProvider>
        <Mousetrap>
          <EasterEgg>{props.children}</EasterEgg>
        </Mousetrap>
      </TransitionProvider>
    </ThemeProvider>
  )
}
