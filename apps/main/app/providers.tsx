'use client'

import EasterEgg from 'services/easteregg/easteregg'
import { Hotkeys } from 'services/hotkeys'
import { SystemProvider } from 'services/system'
import { ThemeProvider } from 'services/theme'
import { Provider as TransitionProvider } from 'services/transition/provider'

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SystemProvider>
        <TransitionProvider>
          <Hotkeys>
            <EasterEgg>{props.children}</EasterEgg>
          </Hotkeys>
        </TransitionProvider>
      </SystemProvider>
    </ThemeProvider>
  )
}
