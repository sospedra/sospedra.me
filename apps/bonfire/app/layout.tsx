import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import './globals.css'

const TITLE = 'Bonfire | The working room'
const DESCRIPTION =
  'A simple Pomodoro Timer paired with ambiance music and Soundcloud playlists. Works on a desktop & mobile browser. Bonfire will help you manage your time and let you focus on any tasks such as study, writing, or coding.'
const FLAME_ICON =
  'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔥</text></svg>'

export const metadata: Metadata = {
  metadataBase: new URL('https://bonfire.sospedra.me'),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: FLAME_ICON,
  },
  openGraph: {
    type: 'website',
    url: 'https://bonfire.sospedra.me/',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        {props.children}
        <Script
          data-goatcounter='https://sospedra.goatcounter.com/count'
          src='https://gc.zgo.at/count.js'
          strategy='afterInteractive'
        />
      </body>
    </html>
  )
}
