'use client'

import EasterEgg from 'service/easteregg'
import { Hotkeys } from 'service/hotkeys'
import { ThemeProvider } from 'service/theme'
import { Provider as TransitionProvider } from 'service/transition'

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TransitionProvider>
        <Hotkeys>
          <EasterEgg>{props.children}</EasterEgg>
        </Hotkeys>
      </TransitionProvider>
    </ThemeProvider>
  )
}
