'use client'

import SystemPanel from 'components/SystemPanel'
import EasterEgg from 'service/easteregg'
import { Hotkeys } from 'service/hotkeys'
import { SystemProvider } from 'service/system'
import { ThemeProvider } from 'service/theme'
import { Provider as TransitionProvider } from 'service/transition'

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SystemProvider>
        <TransitionProvider>
          <Hotkeys>
            <EasterEgg>{props.children}</EasterEgg>
            <SystemPanel />
          </Hotkeys>
        </TransitionProvider>
      </SystemProvider>
    </ThemeProvider>
  )
}
