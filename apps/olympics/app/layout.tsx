import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { Menu } from '../services/menu'
import './globals.css'

const APPLE_ICON_SIZES = [57, 60, 72, 76, 114, 120, 144, 152, 180]

export const metadata: Metadata = {
  title: 'The Olympics Score',
  description: 'A fair way to score the Olympics Games',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      {
        url: '/android-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: APPLE_ICON_SIZES.map((size) => ({
      url: `/apple-icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
    })),
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': '/ms-icon-144x144.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <Menu />
        {props.children}
        <Script
          data-goatcounter='https://olympics.goatcounter.com/count'
          src='https://gc.zgo.at/count.js'
          strategy='afterInteractive'
        />
      </body>
    </html>
  )
}
